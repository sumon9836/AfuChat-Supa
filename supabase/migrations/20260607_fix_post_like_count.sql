-- ─────────────────────────────────────────────────────────────────────────────
-- Fix posts.like_count: keep it in sync with post_acknowledgments rows
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Back-fill existing like_count values from actual acknowledgment rows
UPDATE posts p
SET like_count = (
  SELECT COUNT(*) FROM post_acknowledgments pa WHERE pa.post_id = p.id
);

-- 2. Drop any existing trigger + function so we can recreate cleanly
DROP TRIGGER IF EXISTS trg_post_like_count_incr ON post_acknowledgments;
DROP TRIGGER IF EXISTS trg_post_like_count_decr ON post_acknowledgments;
DROP FUNCTION IF EXISTS fn_increment_post_like_count();
DROP FUNCTION IF EXISTS fn_decrement_post_like_count();

-- 3. Function: increment like_count on INSERT into post_acknowledgments
CREATE OR REPLACE FUNCTION fn_increment_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE posts SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

-- 4. Function: decrement like_count on DELETE from post_acknowledgments
CREATE OR REPLACE FUNCTION fn_decrement_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE posts SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- 5. Attach triggers
CREATE TRIGGER trg_post_like_count_incr
  AFTER INSERT ON post_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION fn_increment_post_like_count();

CREATE TRIGGER trg_post_like_count_decr
  AFTER DELETE ON post_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION fn_decrement_post_like_count();

-- 6. Remove duplicate RLS policies on post_acknowledgments
--    (keeps the cleaner-named ones)
DROP POLICY IF EXISTS "Users can delete their acknowledgments"     ON post_acknowledgments;
DROP POLICY IF EXISTS "Users can insert acknowledgments"           ON post_acknowledgments;
DROP POLICY IF EXISTS "Public acknowledgments are viewable by everyone" ON post_acknowledgments;
