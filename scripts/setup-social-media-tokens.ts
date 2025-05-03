import { createClient } from "@supabase/supabase-js"

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function setupSocialMediaTokensTable() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration")
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log("Creating social_media_tokens table...")

  // Create the table using SQL
  const { error } = await supabase.rpc("create_social_media_tokens_table", {})

  if (error) {
    console.error("Error creating table:", error)

    // If the RPC doesn't exist, create it
    console.log("Creating RPC function...")

    const createRpcResult = await supabase.sql`
      CREATE OR REPLACE FUNCTION create_social_media_tokens_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Create the table if it doesn't exist
        CREATE TABLE IF NOT EXISTS social_media_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          platform TEXT NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          platform_user_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, platform)
        );
        
        -- Create index on user_id and platform
        CREATE INDEX IF NOT EXISTS idx_social_media_tokens_user_platform 
        ON social_media_tokens(user_id, platform);
      END;
      $$;
    `

    if (createRpcResult.error) {
      console.error("Error creating RPC function:", createRpcResult.error)
      return
    }

    // Try creating the table again
    const retryResult = await supabase.rpc("create_social_media_tokens_table", {})

    if (retryResult.error) {
      console.error("Error creating table on retry:", retryResult.error)
      return
    }
  }

  console.log("Social media tokens table created successfully!")
}

// Run the setup
setupSocialMediaTokensTable()
  .then(() => {
    console.log("Setup complete")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Setup failed:", err)
    process.exit(1)
  })
