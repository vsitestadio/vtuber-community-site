"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import "./community.css";

type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};
type Post = {
  id: number;
  content: string;
  category: string;
  likes: number;
  createdAt: string;
  images: string[];
  isOwner: boolean;
  likedByMe: boolean;
  user: Omit<User, "id">;
};
type SelectedImage = { file: File; url: string };
type Stream = {
  id: string;
  title: string;
  platform: string;
  url: string;
  startAt: string;
};
const categories = ["#配信感想", "#ファンアート", "#切り抜き", "#推し語り"];
const uploadImageBytes = 200 * 1024;

async function compressImage(file: File): Promise<File> {
  if (file.size <= uploadImageBytes) return file;
  if (file.type === "image/gif") {
    throw new Error("GIF画像は200KB以下のものを選んでください");
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  let quality = 0.84;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("画像を処理できませんでした");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) throw new Error("画像を処理できませんでした");
    if (blob.size <= uploadImageBytes || attempt === 7) {
      bitmap.close();
      if (blob.size > uploadImageBytes) {
        throw new Error(
          "画像を小さくできませんでした。別の画像を選んでください",
        );
      }
      const name = file.name.replace(/\.[^.]+$/, "") || "image";
      return new File([blob], `${name}.webp`, { type: "image/webp" });
    }
    if (quality > 0.5) quality -= 0.1;
    else {
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
  }
  bitmap.close();
  throw new Error("画像を処理できませんでした");
}

export default function CommunityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [postError, setPostError] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState(categories[0]);
  const [actionMessage, setActionMessage] = useState("");
  const [openPostMenuId, setOpenPostMenuId] = useState<number | null>(null);

  async function load() {
    const [meResponse, postsResponse, scheduleResponse] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/posts"),
      fetch("/api/schedule"),
    ]);
    setUser((await meResponse.json()).user);
    setPosts((await postsResponse.json()).posts ?? []);
    setStreams((await scheduleResponse.json()).streams ?? []);
    setLoading(false);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading && !user) setLoginOpen(true);
  }, [loading, user]);

  useEffect(() => {
    function checkNotifications() {
      if (
        localStorage.getItem("luna_notification_enabled") !== "true" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      )
        return;

      const now = Date.now();
      streams.forEach((stream) => {
        const remaining = Date.parse(stream.startAt) - now;
        const noticeKey = `luna_notified_${stream.id}_${stream.startAt}`;
        if (
          remaining > 0 &&
          remaining <= 10 * 60 * 1000 &&
          !localStorage.getItem(noticeKey)
        ) {
          new Notification(`${stream.title}が10分後に始まります`, {
            body: `${stream.platform}の配信ページを開いて待機しましょう。`,
            tag: noticeKey,
          });
          localStorage.setItem(noticeKey, "true");
        }
      });
    }

    checkNotifications();
    const timer = window.setInterval(checkNotifications, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [streams]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEnlargedImage(null);
        setOpenPostMenuId(null);
      }
    }
    function closePostMenu(event: MouseEvent) {
      if (!(event.target as Element).closest(".post-menu")) {
        setOpenPostMenuId(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("click", closePostMenu);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("click", closePostMenu);
    };
  }, []);

  function streamDayLabel(startAt: string) {
    const date = new Date(startAt);
    const today = new Date();
    const dateText = date.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
    const todayText = today.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
    return dateText === todayText ? "今日" : dateText;
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (authView === "register" && password !== confirmation) {
      setAuthError("確認用パスワードが一致しません");
      return;
    }
    setAuthSubmitting(true);
    try {
      const response = await fetch(
        `/api/auth/${authView === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: form.get("displayName"),
            email: form.get("email"),
            password,
          }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (response.ok) window.location.reload();
      else
        setAuthError(
          data.error ?? "登録に失敗しました。もう一度お試しください",
        );
    } catch {
      setAuthError("通信に失敗しました。もう一度お試しください");
    } finally {
      setAuthSubmitting(false);
    }
  }

  function changeAuthView(view: "login" | "register") {
    setAuthView(view);
    setAuthError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setLoginOpen(true);
      return;
    }
    if (!content.trim() && selectedImages.length === 0) {
      setPostError("文章または画像を追加してください");
      return;
    }
    setPostError("");
    const form = new FormData();
    form.set("content", content);
    form.set("category", category);
    selectedImages.forEach(({ file }) => form.append("images", file));
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        post?: Post;
        error?: string;
      };
      if (response.ok && data.post) {
        setPosts((current) => [
          { ...data.post, isOwner: true, likedByMe: false },
          ...current,
        ]);
        setContent("");
        selectedImages.forEach(({ url }) => URL.revokeObjectURL(url));
        setSelectedImages([]);
      } else {
        setPostError(
          response.status === 413
            ? "画像の合計容量が大きすぎます。枚数を減らしてください"
            : (data.error ?? "投稿に失敗しました"),
        );
      }
    } catch {
      setPostError(
        "通信に失敗しました。内容を残したまま、もう一度お試しください",
      );
    }
  }

  async function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const remaining = 4 - selectedImages.length;
    const candidates = files.slice(0, remaining).filter((file) => {
      return (
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ) && file.size <= 5 * 1024 * 1024
      );
    });
    if (
      candidates.length !== files.slice(0, remaining).length ||
      files.length > remaining
    ) {
      setPostError("画像は4枚まで、JPG・PNG・WebP・GIF、1枚5MB以内です");
    }
    setImageProcessing(true);
    try {
      const compressed = await Promise.all(
        candidates.map((file) => compressImage(file)),
      );
      setSelectedImages((current) => [
        ...current,
        ...compressed.map((file) => ({ file, url: URL.createObjectURL(file) })),
      ]);
      if (candidates.length === files.length) setPostError("");
    } catch (error) {
      setPostError(
        error instanceof Error ? error.message : "画像を処理できませんでした",
      );
    } finally {
      setImageProcessing(false);
    }
  }

  function removeImage(index: number) {
    setSelectedImages((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  }

  async function toggleLike(postId: number) {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as {
      liked?: boolean;
      likes?: number;
      error?: string;
    };
    if (!response.ok) {
      setActionMessage(data.error ?? "いいねに失敗しました");
      return;
    }
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByMe: Boolean(data.liked),
              likes: data.likes ?? post.likes,
            }
          : post,
      ),
    );
  }

  function startEditing(post: Post) {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditCategory(post.category);
    setActionMessage("");
    setOpenPostMenuId(null);
  }

  async function saveEdit(postId: number) {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent, category: editCategory }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      post?: { content: string; category: string };
      error?: string;
    };
    if (!response.ok || !data.post) {
      setActionMessage(data.error ?? "編集に失敗しました");
      return;
    }
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, ...data.post } : post,
      ),
    );
    setEditingPostId(null);
    setActionMessage("投稿を更新しました");
  }

  async function deletePost(postId: number) {
    if (!window.confirm("この投稿を削除しますか？")) return;
    const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (!response.ok) {
      setActionMessage(data.error ?? "削除に失敗しました");
      return;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
    setActionMessage("投稿を削除しました");
  }

  async function sharePost(post: Post) {
    const url = `${window.location.origin}/community#post-${post.id}`;
    const shareData = {
      title: `${post.user.displayName}さんの投稿`,
      text: post.content,
      url,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url);
        setActionMessage("投稿URLをコピーしました");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setActionMessage("シェアできませんでした");
    }
  }

  const visiblePosts = useMemo(
    () =>
      posts.filter((post) => {
        const categoryMatch = filter === "all" || post.category === filter;
        const searchMatch =
          `${post.content} ${post.category} ${post.user.displayName}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return categoryMatch && searchMatch;
      }),
    [posts, filter, search],
  );

  return (
    <main className="community-page">
      <header className="community-header">
        <a className="community-brand" href="/home.html">
          <span>✦</span>
          <b>
            Luna<em>Link</em>
          </b>
        </a>
        <label className="community-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="投稿やタグを検索"
          />
        </label>
        {user ? (
          <div className="user-menu">
            <span>{user.displayName.slice(0, 1)}</span>
            <div>
              <b>{user.displayName}</b>
              <small>@{user.username}</small>
            </div>
            <form action="/api/auth/logout" method="post">
              <button>ログアウト</button>
            </form>
          </div>
        ) : (
          <button className="login-small" onClick={() => setLoginOpen(true)}>
            Xでログイン
          </button>
        )}
      </header>

      <div className="community-shell">
        <aside className="community-side">
          <nav>
            <a href="/home.html">
              ⌂ <span>公式ホーム</span>
            </a>
            <a className="active" href="#feed">
              ☾ <span>コミュニティ</span>
            </a>
            <a href="#schedule">
              ▣ <span>配信予定</span>
            </a>
            <a href="/contents">
              ▷ <span>配信内容</span>
            </a>
          </nav>
          <section>
            <small>今週のテーマ</small>
            <h2>
              初見さんに
              <br />
              おすすめの1本
            </h2>
            <p>推しの魅力が伝わる配信を教えてください！</p>
            <a className="theme-ranking-link" href="/contents">
              配信を探す →
            </a>
          </section>
        </aside>

        <section className="feed" id="feed">
          <div className="feed-welcome">
            <div>
              <small>MOONLIGHT LOUNGE</small>
              <h1>今日も、推しの話をしよう。</h1>
              <p>星乃ルナとルナメイトがつながる場所。</p>
            </div>
            <span>✦</span>
          </div>
          {user ? (
            <form className="composer-card" onSubmit={submit}>
              <div className="composer-main">
                <span className="avatar">{user.displayName.slice(0, 1)}</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={240}
                  placeholder="推しについて何を話す？"
                />
              </div>
              {selectedImages.length > 0 && (
                <div
                  className={`composer-images count-${selectedImages.length}`}
                >
                  {selectedImages.map((image, index) => (
                    <figure key={image.url}>
                      <img src={image.url} alt={`投稿画像 ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label={`画像${index + 1}を削除`}
                      >
                        ×
                      </button>
                    </figure>
                  ))}
                </div>
              )}
              <div className="composer-bottom">
                <div className="composer-tags">
                  {categories.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className={category === tag ? "selected" : ""}
                      onClick={() => setCategory(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  <label className="image-picker">
                    <span>▧ 画像を追加</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={selectImages}
                    />
                  </label>
                </div>
                <button className="post-submit" disabled={imageProcessing}>
                  {imageProcessing ? "画像を準備中…" : "投稿する"}
                </button>
              </div>
              {postError && (
                <p className="post-error" role="alert">
                  {postError}
                </p>
              )}
            </form>
          ) : (
            <button className="login-banner" onClick={() => setLoginOpen(true)}>
              <span>𝕏</span>
              <div>
                <b>ログインして投稿に参加</b>
                <small>投稿・いいねにはXアカウントでのログインが必要です</small>
              </div>
              <i>→</i>
            </button>
          )}

          <div className="filter-row">
            <b>カテゴリー</b>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              すべて
            </button>
            {categories.map((tag) => (
              <button
                key={tag}
                className={filter === tag ? "active" : ""}
                onClick={() => setFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="posts-list">
            {loading && (
              <div className="empty-card">投稿を読み込んでいます…</div>
            )}
            {!loading && visiblePosts.length === 0 && (
              <div className="empty-card">
                <span>☾</span>
                <h2>最初の投稿をしてみよう</h2>
                <p>まだこのカテゴリーの投稿はありません。</p>
              </div>
            )}
            {visiblePosts.map((post) => (
              <article
                className="post-card"
                id={`post-${post.id}`}
                key={post.id}
              >
                <div className="post-author">
                  {post.user.avatarUrl ? (
                    <img src={post.user.avatarUrl} alt="" />
                  ) : (
                    <span className="avatar">
                      {post.user.displayName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <b>{post.user.displayName}</b>
                    <small>
                      @{post.user.username} ·{" "}
                      {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                    </small>
                  </div>
                  {post.isOwner && (
                    <div className="post-menu">
                      <button
                        type="button"
                        className="post-menu-trigger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenPostMenuId((current) =>
                            current === post.id ? null : post.id,
                          );
                        }}
                        aria-label="投稿メニューを開く"
                        aria-expanded={openPostMenuId === post.id}
                      >
                        •••
                      </button>
                      {openPostMenuId === post.id && (
                        <div className="post-menu-popup" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => startEditing(post)}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="delete"
                            onClick={() => {
                              setOpenPostMenuId(null);
                              deletePost(post.id);
                            }}
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {editingPostId === post.id ? (
                  <div className="post-editor">
                    <textarea
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      maxLength={240}
                    />
                    <div>
                      <select
                        value={editCategory}
                        onChange={(event) =>
                          setEditCategory(event.target.value)
                        }
                      >
                        {categories.map((tag) => (
                          <option key={tag}>{tag}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="edit-save"
                        onClick={() => saveEdit(post.id)}
                      >
                        保存する
                      </button>
                    </div>
                  </div>
                ) : (
                  post.content && <p>{post.content}</p>
                )}
                {post.images?.length > 0 && (
                  <div className={`post-images count-${post.images.length}`}>
                    {post.images.map((image, index) => (
                      <button
                        className="post-image-button"
                        type="button"
                        key={image}
                        onClick={() => setEnlargedImage(image)}
                        aria-label={`投稿画像 ${index + 1}を拡大`}
                      >
                        <img
                          src={image}
                          alt={`投稿画像 ${index + 1}`}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className="post-tag"
                  onClick={() => setFilter(post.category)}
                >
                  {post.category}
                </button>
                <div className="post-actions">
                  <button
                    type="button"
                    className={post.likedByMe ? "liked" : ""}
                    onClick={() => toggleLike(post.id)}
                    aria-label={
                      post.likedByMe ? "いいねを取り消す" : "いいねする"
                    }
                  >
                    {post.likedByMe ? "♥" : "♡"} {post.likes}
                  </button>
                  <button>▢ 0</button>
                  <button type="button" onClick={() => sharePost(post)}>
                    ↗ シェア
                  </button>
                  <button>♧</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="community-right" id="schedule">
          <section>
            <small>UPCOMING</small>
            <h2>まもなく配信</h2>
            {streams.slice(0, 3).map((stream) => (
              <a
                className="upcoming-stream"
                href={stream.url}
                target="_blank"
                rel="noreferrer"
                key={`${stream.id}-${stream.startAt}`}
              >
                <time>
                  {new Date(stream.startAt).toLocaleTimeString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <div>
                  <b>{stream.title}</b>
                  <p>
                    {streamDayLabel(stream.startAt)} · {stream.platform}
                  </p>
                </div>
              </a>
            ))}
          </section>
          <section>
            <small>COMMUNITY</small>
            <h2>ルナメイトへ</h2>
            <p>
              相手を思いやり、みんなが安心して推しを語れる場所にしましょう。
            </p>
            <a href="#">ガイドライン →</a>
          </section>
        </aside>
      </div>

      {loginOpen && (
        <div className="login-backdrop" role="presentation">
          <section
            className="login-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
          >
            <span className="login-logo">✦</span>
            <small>WELCOME TO</small>
            <h2 id="login-title">
              {authView === "login" ? "ログイン" : "新規登録"}
            </h2>
            <p>
              {authView === "login"
                ? "ログインしてルナメイトの会話に参加しよう。"
                : "無料アカウントを作成して投稿を始めよう。"}
            </p>
            <form className="email-auth-form" onSubmit={submitAuth}>
              {authView === "register" && (
                <label>
                  <span>表示名</span>
                  <input
                    name="displayName"
                    maxLength={30}
                    autoComplete="name"
                    placeholder="例：ルナ推し"
                    required
                  />
                </label>
              )}
              <label>
                <span>メールアドレス</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  required
                />
              </label>
              <label>
                <span>パスワード</span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete={
                    authView === "login" ? "current-password" : "new-password"
                  }
                  placeholder="8文字以上"
                  required
                />
              </label>
              {authView === "register" && (
                <label>
                  <span>パスワード（確認）</span>
                  <input
                    name="passwordConfirmation"
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    placeholder="もう一度入力"
                    required
                  />
                </label>
              )}
              {authError && (
                <p className="auth-error" role="alert">
                  {authError}
                </p>
              )}
              <button className="email-auth-submit" disabled={authSubmitting}>
                {authSubmitting
                  ? "処理中…"
                  : authView === "login"
                    ? "ログイン"
                    : "新規登録"}
              </button>
            </form>
            <div className="auth-divider">
              <span>または</span>
            </div>
            <a className="x-login" href="/api/auth/x">
              <b>𝕏</b> Xで{authView === "login" ? "ログイン" : "登録"}
            </a>
            <p className="auth-switch">
              {authView === "login"
                ? "アカウントをお持ちでない方"
                : "すでにアカウントをお持ちの方"}
              <button
                type="button"
                onClick={() =>
                  changeAuthView(authView === "login" ? "register" : "login")
                }
              >
                {authView === "login" ? "新規登録はこちら" : "ログインはこちら"}
              </button>
            </p>
          </section>
        </div>
      )}
      {enlargedImage && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="投稿画像の拡大表示"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setEnlargedImage(null)}
            aria-label="拡大表示を閉じる"
          >
            ×
          </button>
          <img
            src={enlargedImage}
            alt="拡大した投稿画像"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
      {actionMessage && (
        <button
          type="button"
          className="action-toast"
          onClick={() => setActionMessage("")}
          role="status"
        >
          {actionMessage}
        </button>
      )}
    </main>
  );
}
