CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`x_user_id` text,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_x_user_id_unique` ON `users` (`x_user_id`);
--> statement-breakpoint
INSERT INTO `users` (`id`, `username`, `display_name`) VALUES
  ('seed-minato', 'minato_oshilife', 'みなと'),
  ('seed-aoi', 'aoi_draws', 'あおい');
--> statement-breakpoint
INSERT INTO `posts` (`user_id`, `content`, `category`, `likes`) VALUES
  ('seed-minato', '昨日の歌枠、選曲が本当に最高だった…！ 静かな曲から最後の盛り上がりまで、ずっと世界観に引き込まれました。', '#配信感想', 124),
  ('seed-aoi', '新衣装がかわいすぎたので描きました！ 袖の細かい模様までじっくり見られるお披露目配信、何度でも観たいです。', '#ファンアート', 287);
