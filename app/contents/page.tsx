"use client";

import { useEffect, useMemo, useState } from "react";
import "../ranking/ranking.css";

type Genre = "すべて" | "ASMR" | "ゲーム実況" | "雑談";
type Video = {
  id: string;
  title: string;
  description: string;
  duration: string;
  genre: Exclude<Genre, "すべて">;
  url: string;
  theme: string;
  votes: number;
  votedByMe: boolean;
};
const genres: Genre[] = ["すべて", "ASMR", "ゲーム実況", "雑談"];

export default function ContentsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [genre, setGenre] = useState<Genre>("すべて");
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("");
  const visibleVideos = useMemo(
    () => videos.filter((video) => genre === "すべて" || video.genre === genre),
    [videos, genre],
  );

  useEffect(() => {
    fetch("/api/ranking")
      .then((response) => response.json())
      .then((data) => {
        setVideos(data.videos ?? []);
        setLoggedIn(Boolean(data.loggedIn));
      });
  }, []);

  async function vote(videoId: string) {
    if (!loggedIn) {
      window.location.href = "/community";
      return;
    }
    const response = await fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "投票できませんでした");
      return;
    }
    setVideos((current) =>
      current
        .map((video) =>
          video.id === videoId
            ? { ...video, votes: data.votes, votedByMe: data.voted }
            : video,
        )
        .sort((a, b) => b.votes - a.votes),
    );
    setMessage(data.voted ? "おすすめに投票しました" : "投票を取り消しました");
  }

  return (
    <main className="ranking-page contents-page">
      <header className="ranking-header">
        <a className="ranking-logo" href="/home.html">
          <span>☾</span>
          <b>
            HOSHINO LUNA<small>OFFICIAL WEBSITE</small>
          </b>
        </a>
        <nav>
          <a href="/home.html">HOME</a>
          <a href="/community">COMMUNITY</a>
        </nav>
      </header>

      <section className="contents-hero">
        <small>STREAM CONTENTS</small>
        <h1>配信内容</h1>
        <p>その日の気分に合わせて、観たい配信を見つけよう。</p>
      </section>

      <section className="genre-section">
        <div className="ranking-heading">
          <small>FIND YOUR FAVORITE</small>
          <h2>ジャンルから探す</h2>
          <p>ASMR・ゲーム実況・雑談から、気になる配信を選べます。</p>
        </div>
        <div className="genre-tabs" role="tablist" aria-label="配信ジャンル">
          {genres.map((item) => (
            <button
              key={item}
              className={genre === item ? "active" : ""}
              onClick={() => setGenre(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="video-grid">
          {visibleVideos.map((video) => (
            <article
              className={`genre-card theme-${video.theme}`}
              key={video.id}
            >
              <a
                className="genre-thumbnail"
                href={video.url}
                target="_blank"
                rel="noreferrer"
              >
                <img src="/luna-hero.png" alt="星乃ルナの配信" />
                <span className="thumbnail-live">LIVE</span>
                <span className="thumbnail-copy">
                  <small>HOSHINO LUNA STREAM</small>
                  <strong>{video.title}</strong>
                </span>
                <span className="play">▶</span>
                <time>{video.duration}</time>
                <b>{video.genre}</b>
              </a>
              <div>
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                <a href={video.url} target="_blank" rel="noreferrer">
                  配信を観る →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ranking-list fan-ranking">
        <div className="ranking-heading">
          <small>FAN&apos;S SELECTION</small>
          <h2>ファンが選んだおすすめ動画</h2>
          <p>
            ルナメイトの投票で順位が決まる、初見さんに観てほしい配信ランキング。
          </p>
        </div>
        <div className="ranking-cards">
          {videos.slice(0, 3).map((video, index) => (
            <article
              className={`ranking-card theme-${video.theme}`}
              key={video.id}
            >
              <div className="rank-number">
                <small>RANK</small>
                <b>{index + 1}</b>
              </div>
              <a
                className="video-thumbnail"
                href={video.url}
                target="_blank"
                rel="noreferrer"
              >
                <img src="/luna-hero.png" alt="星乃ルナの配信" />
                <span className="thumbnail-live">LIVE</span>
                <span className="thumbnail-copy">
                  <small>HOSHINO LUNA STREAM</small>
                  <strong>{video.title}</strong>
                </span>
                <span className="play">▶</span>
                <time>{video.duration}</time>
              </a>
              <div className="video-info">
                <span className="genre-label">{video.genre}</span>
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                <div>
                  <a href={video.url} target="_blank" rel="noreferrer">
                    配信を観る →
                  </a>
                  <button
                    className={video.votedByMe ? "voted" : ""}
                    onClick={() => vote(video.id)}
                  >
                    ♡ {video.votes}票
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ranking-cta">
        <small>WELCOME TO LUNAMATE</small>
        <h2>
          お気に入りが見つかったら、
          <br />
          次の配信で会いましょう。
        </h2>
        <p>チャンネル登録と通知をオンにすると、新しい配信を見逃しません。</p>
        <div>
          <a
            href="https://www.youtube.com/results?search_query=Vtuber"
            target="_blank"
            rel="noreferrer"
          >
            チャンネル登録する
          </a>
          <a href="/community">ファンと交流する</a>
        </div>
      </section>
      {message && (
        <button className="ranking-toast" onClick={() => setMessage("")}>
          {message}
        </button>
      )}
    </main>
  );
}
