import { createClient } from "@supabase/supabase-js"

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function setupSocialMediaSchema() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log("Creating social_media_tokens table...")

  // Create the social_media_tokens table
  const { error: createError } = await supabase.rpc("create_social_media_tokens_table", {})

  if (createError) {
    if (createError.message.includes("already exists")) {
      console.log("Table social_media_tokens already exists")
    } else {
      console.error("Error creating social_media_tokens table:", createError)
      process.exit(1)
    }
  } else {
    console.log("Table social_media_tokens created successfully")
  }

  console.log("Setup completed successfully")
}

// Execute the setup
setupSocialMediaSchema().catch(console.error)
