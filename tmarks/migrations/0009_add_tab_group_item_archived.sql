-- Add is_archived column to tab_group_items table
-- This allows users to archive tab items they don't need but want to keep

ALTER TABLE tab_group_items ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

-- Create index for archived items query performance
CREATE INDEX idx_tab_group_items_archived ON tab_group_items(group_id, is_archived, position ASC);

-- Create index for filtering non-archived items
CREATE INDEX idx_tab_group_items_not_archived ON tab_group_items(group_id, is_archived) WHERE is_archived = 0;
