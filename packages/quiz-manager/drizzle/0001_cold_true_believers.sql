CREATE INDEX `accepted_answers_question_sort_idx` ON `accepted_answers` (`question_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `answer_options_question_sort_idx` ON `answer_options` (`question_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `questions_quiz_sort_idx` ON `questions` (`quiz_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `quiz_tags_quiz_id_idx` ON `quiz_tags` (`quiz_id`);--> statement-breakpoint
CREATE INDEX `quiz_tags_tag_id_idx` ON `quiz_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `quizzes_created_at_idx` ON `quizzes` (`created_at`);