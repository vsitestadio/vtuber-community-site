export type Stream = {
  id: string;
  title: string;
  subtitle: string;
  platform: string;
  url: string;
  startAt: string;
};

// 配信予定はここだけを編集します。曜日は 0=日曜、1=月曜 ... 6=土曜です。
const weeklySchedule = [
  {
    id: "costume-talk",
    weekday: 4,
    hour: 21,
    minute: 0,
    title: "新衣装のお話とまったり雑談配信",
    subtitle: "NEW COSTUME TALK",
    platform: "YouTube Live",
    url: "https://www.youtube.com/results?search_query=Vtuber",
  },
  {
    id: "midnight-song",
    weekday: 6,
    hour: 22,
    minute: 30,
    title: "深夜のまったり歌枠",
    subtitle: "リクエスト歓迎",
    platform: "YouTube",
    url: "https://www.youtube.com/results?search_query=Vtuber",
  },
  {
    id: "co-op-game",
    weekday: 0,
    hour: 20,
    minute: 0,
    title: "4人で協力ゲーム！",
    subtitle: "ルナメイト参加型",
    platform: "YouTube",
    url: "https://www.youtube.com/results?search_query=Vtuber",
  },
] as const;

export function getUpcomingStreams(now = new Date()): Stream[] {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentMinutes = jstNow.getUTCHours() * 60 + jstNow.getUTCMinutes();

  return weeklySchedule
    .map((stream) => {
      let daysAhead = (stream.weekday - jstNow.getUTCDay() + 7) % 7;
      const targetMinutes = stream.hour * 60 + stream.minute;
      if (daysAhead === 0 && targetMinutes <= currentMinutes) daysAhead = 7;

      const startAt = new Date(
        Date.UTC(
          jstNow.getUTCFullYear(),
          jstNow.getUTCMonth(),
          jstNow.getUTCDate() + daysAhead,
          stream.hour - 9,
          stream.minute,
        ),
      );

      return { ...stream, startAt: startAt.toISOString() };
    })
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}
