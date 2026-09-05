export const rankingVideos = [
  {
    id: "first-live",
    title: "星乃ルナを知るなら、まずはこの初配信",
    description:
      "ルナの世界観や好きなものがぎゅっと詰まった、初見さんにおすすめの1本。",
    duration: "58:24",
    genre: "雑談",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "first",
  },
  {
    id: "best-song",
    title: "心に残る、月夜の歌枠セレクション",
    description:
      "透明感のある歌声をじっくり楽しめる、ファン人気の高い歌枠です。",
    duration: "1:32:10",
    genre: "ASMR",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "song",
  },
  {
    id: "funny-game",
    title: "笑いが止まらない協力ゲーム配信",
    description:
      "ルナらしいリアクションと掛け合いが楽しめる、何度も見返したくなる配信。",
    duration: "2:06:48",
    genre: "ゲーム実況",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "game",
  },
  {
    id: "sleep-asmr",
    title: "眠れない夜の囁きASMR",
    description:
      "やさしい囁きと耳かき音で、ゆっくり眠りにつきたい夜におすすめ。",
    duration: "1:48:32",
    genre: "ASMR",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "asmr",
  },
  {
    id: "horror-game",
    title: "絶叫と笑いのホラーゲーム実況",
    description:
      "怖がりながらも最後まで挑戦する、リアクションたっぷりの人気回。",
    duration: "2:14:05",
    genre: "ゲーム実況",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "horror",
  },
  {
    id: "night-chat",
    title: "月明かりの深夜雑談",
    description:
      "活動の裏話や最近あったことを、ゆったりした雰囲気で楽しめます。",
    duration: "1:16:44",
    genre: "雑談",
    url: "https://www.youtube.com/results?search_query=Vtuber",
    theme: "chat",
  },
] as const;

export const rankingVideoIds = rankingVideos.map((video) => video.id);
