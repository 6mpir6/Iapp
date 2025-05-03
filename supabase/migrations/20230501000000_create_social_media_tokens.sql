-- Create the social_media_tokens table
CREATE OR REPLACE FUNCTION create_social_media_tokens_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'social_media_tokens') THEN
    -- Create the table
    CREATE TABLE public.social_media_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      platform TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      platform_user_id TEXT NOT NULL,
      username TEXT,
      profile_image_url TEXT,
      follower_count INTEGER,
      post_count INTEGER,
      account_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );

    -- Create indexes
    CREATE INDEX idx_social_media_tokens_user_id ON public.social_media_tokens(user_id);
    CREATE UNIQUE INDEX idx_social_media_tokens_user_platform ON public.social_media_tokens(user_id, platform);

    -- Set up RLS policies
    ALTER TABLE public.social_media_tokens ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own tokens"
      ON public.social_media_tokens
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own tokens"
      ON public.social_media_tokens
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own tokens"
      ON public.social_media_tokens
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own tokens"
      ON public.social_media_tokens
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
