/**
 * Z-Index 层级常量
 * 统一管理所有组件的 z-index 值，避免层级冲突
 * 
 * 层级规范：
 * - 0-9: 正常内容层
 * - 10-49: 固定元素（导航栏、底部栏等）
 * - 50-99: 弹出层（下拉菜单、工具提示等）
 * - 100-199: 模态框背景层
 * - 200-299: 模态框内容层
 * - 300-399: 全局提示/通知
 * - 400-499: 最高优先级（确认对话框等）
 */

export const Z_INDEX = {
  // 正常内容层 (0-9)
  NORMAL: 0,
  
  // 固定元素层 (10-49)
  HEADER: 10,
  MOBILE_BOTTOM_NAV: 20,
  BATCH_ACTION_BAR: 30,
  
  // 弹出层 (50-99)
  DROPDOWN: 50,
  TOOLTIP: 60,
  POPOVER: 70,
  TAGS_INPUT: 50,
  DRAWER_BACKDROP: 40,
  DRAWER_CONTENT: 50,
  
  // 模态框层 (100-299)
  MODAL_BACKDROP: 100,
  MODAL_CONTENT: 200,
  TAG_MANAGE_MODAL: 200,
  MOVE_ITEM_DIALOG: 200,
  SHARE_DIALOG: 200,
  MOVE_TO_FOLDER_DIALOG: 200,
  TAG_FORM_MODAL: 210,
  
  // 全局提示层 (300-399)
  TOAST: 300,
  SUCCESS_MESSAGE: 300,
  ERROR_MESSAGE: 300,
  
  // 最高优先级层 (400-499)
  CONFIRM_DIALOG: 400,
  ALERT_DIALOG: 400,
} as const

export type ZIndexKey = keyof typeof Z_INDEX

