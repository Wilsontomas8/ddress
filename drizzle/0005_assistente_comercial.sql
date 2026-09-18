ALTER TABLE "settings" ADD COLUMN "assistant_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "assistant_name" text DEFAULT 'Joyce' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "assistant_greeting" text DEFAULT 'Bem-vindo(a) à DDRESS, sou a Joyce, assistente comercial. Em que posso ajudar?' NOT NULL;