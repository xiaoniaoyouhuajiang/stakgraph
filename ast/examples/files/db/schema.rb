
ActiveRecord::Schema.define(version: 2025_01_07_193635) do

    create_table "candidate_notes", force: :cascade do |t|
      t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
      t.bigint "candidate_profile_id"
      t.string "body"
      t.datetime "created_at", precision: 6, null: false
      t.datetime "updated_at", precision: 6, null: false
      t.bigint "user_id", null: false
      t.string "subject", null: false
      t.integer "global_person_id"
      t.bigint "team_id"
      t.index ["candidate_profile_id"], name: "index_candidate_notes_on_candidate_profile_id"
      t.index ["global_person_id"], name: "index_candidate_notes_on_global_person_id"
      t.index ["team_id"], name: "index_candidate_notes_on_team_id"
      t.index ["user_id"], name: "index_candidate_notes_on_user_id"
    end
    
    create_table "candidate_profiles", force: :cascade do |t|
      t.uuid "uuid", default: -> { "gen_random_uuid()" }, null: false
      t.bigint "user_id", null: false
      t.string "location"
      t.string "level"
      t.datetime "created_at", precision: 6, null: false
      t.datetime "updated_at", precision: 6, null: false
      t.string "title"
      t.string "linkedin_url"
      t.string "skills", default: [], array: true
      t.string "bio"
      t.string "job_status"
      t.string "funding_stage_experience", default: [], array: true
      t.string "minimum_salary"
      t.text "what_youre_looking_for"
      t.boolean "is_profile_public", default: true
      t.boolean "needs_visa_sponsorship"
      t.string "company"
      t.string "opportunity_type", default: [], array: true
      t.bigint "owner_id"
      t.bigint "team_id"
      t.bigint "global_person_id"
      t.string "headline"
      t.string "stage_preference", default: [], array: true
      t.string "function_preference", default: [], array: true
      t.string "functions", default: [], array: true
      t.string "level_preference", default: [], array: true
      t.string "ideal_company_size", default: [], array: true
      t.string "work_status"
      t.string "office_preference", default: [], array: true
      t.datetime "deleted_at"
      t.datetime "archived_at"
      t.index ["archived_at"], name: "index_candidate_profiles_on_archived_at"
      t.index ["deleted_at"], name: "index_candidate_profiles_on_deleted_at"
      t.index ["function_preference"], name: "index_candidate_profiles_on_function_preference", using: :gin
      t.index ["functions"], name: "index_candidate_profiles_on_functions", using: :gin
      t.index ["global_person_id"], name: "index_candidate_profiles_on_global_person_id"
      t.index ["ideal_company_size"], name: "index_candidate_profiles_on_ideal_company_size", using: :gin
      t.index ["level"], name: "index_candidate_profiles_on_level"
      t.index ["level_preference"], name: "index_candidate_profiles_on_level_preference", using: :gin
      t.index ["office_preference"], name: "index_candidate_profiles_on_office_preference", using: :gin
      t.index ["opportunity_type"], name: "index_candidate_profiles_on_opportunity_type", using: :gin
      t.index ["owner_id"], name: "index_candidate_profiles_on_owner_id"
      t.index ["stage_preference"], name: "index_candidate_profiles_on_stage_preference", using: :gin
      t.index ["team_id", "global_person_id"], name: "index_candidate_profiles_on_team_id_and_global_person_id", unique: true
      t.index ["team_id", "level"], name: "index_candidate_profiles_on_team_id_and_level"
      t.index ["team_id", "location"], name: "index_candidate_profiles_on_team_id_and_location"
      t.index ["user_id"], name: "index_candidate_profiles_on_user_id"
      t.index ["uuid"], name: "index_candidate_profiles_on_uuid", unique: true
    end
  
  end