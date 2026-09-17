CREATE TABLE "home_slides" (
	"id" text PRIMARY KEY NOT NULL,
	"kicker" text DEFAULT '' NOT NULL,
	"title_top" text NOT NULL,
	"title_bottom" text DEFAULT '' NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"primary_label" text DEFAULT '' NOT NULL,
	"primary_href" text DEFAULT '' NOT NULL,
	"secondary_label" text DEFAULT '' NOT NULL,
	"secondary_href" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "home_slides_ordem_idx" ON "home_slides" USING btree ("active","position");