CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`accent` text DEFAULT '#354cff' NOT NULL,
	`logo` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_owner_unique` ON `agencies` (`owner`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`agencyId` text NOT NULL,
	`name` text NOT NULL,
	`brief` text DEFAULT '' NOT NULL,
	`tokenHash` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_tokenHash_unique` ON `clients` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `clients_agency` ON `clients` (`agencyId`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`designId` text NOT NULL,
	`author` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`designId`) REFERENCES `designs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_design` ON `comments` (`designId`);--> statement-breakpoint
CREATE TABLE `designs` (
	`id` text PRIMARY KEY NOT NULL,
	`clientId` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`fileKey` text DEFAULT '' NOT NULL,
	`html` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`saved` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `designs_client` ON `designs` (`clientId`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`designId` text NOT NULL,
	`actor` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`designId`) REFERENCES `designs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reactions_actor` ON `reactions` (`designId`,`actor`);