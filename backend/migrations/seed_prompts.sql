-- Idempotent seed script for all 8 ASAP prompts (SQL)
-- Section 10.3 ASAP Ground Truth Mapping

INSERT INTO prompts (id, asap_set_id, title, rubric_min, rubric_max)
VALUES
  (uuid_generate_v4(), 1, 'Prompt 1: Effects of Computers on Society (Persuasive)', 2.0, 12.0),
  (uuid_generate_v4(), 2, 'Prompt 2: Censorship in Libraries and Free Expression (Persuasive)', 1.0, 6.0),
  (uuid_generate_v4(), 3, 'Prompt 3: Rough Road Ahead / Cyclist Perseverance (Source-dependent)', 0.0, 3.0),
  (uuid_generate_v4(), 4, 'Prompt 4: Winter Hibiscus / Cultural Heritage & Resilience (Source-dependent)', 0.0, 3.0),
  (uuid_generate_v4(), 5, 'Prompt 5: Narciso Rodriguez / Fashion, Memory & Family Heritage (Source-dependent)', 0.0, 4.0),
  (uuid_generate_v4(), 6, 'Prompt 6: The Dirigibles / Mooring Masts & Airship Navigation (Source-dependent)', 0.0, 4.0),
  (uuid_generate_v4(), 7, 'Prompt 7: Patience, Perseverance and Character Development (Narrative)', 0.0, 30.0),
  (uuid_generate_v4(), 8, 'Prompt 8: Laughter and Shared Human Experience (Narrative)', 0.0, 60.0)
ON CONFLICT (asap_set_id) DO UPDATE SET
  title = EXCLUDED.title,
  rubric_min = EXCLUDED.rubric_min,
  rubric_max = EXCLUDED.rubric_max;
