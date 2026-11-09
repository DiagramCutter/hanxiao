<template>
  <el-dialog
    v-model="visible"
    title="槽孔施工状态"
    width="min(1200px, 94vw)"
    top="5vh"
    append-to-body
    class="slot-status-dialog"
    :close-on-click-modal="false"
  >
    <div class="status-toolbar">
      <span>三槽九铣 · 每 60 秒刷新</span>
      <el-button :loading="loading" size="small" @click="refresh">刷新</el-button>
    </div>
    <p class="update-time" aria-live="polite">
      {{ lastFetched ? `上次刷新：${lastFetched}` : '正在读取槽孔状态…'
      }}
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <SlotSectionChart :slots="slots" />
    <div class="legend">
      <span><i class="soil" />未开挖土石</span
      ><span><i class="excavated" />已成孔区域</span
      ><span><i class="boundary" />当前深度分界线</span>
    </div>
    <p class="footnote">
      地面为 0 m，深度向下递增。每槽按 1、3、2 铣排列，悬停查看成槽数据。
    </p>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElButton, ElDialog } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/dialog/style/css'
import SlotSectionChart from './SlotSectionChart.vue'
import { useSlotStatus } from './useSlotStatus'
const visible = defineModel<boolean>({ default: false })
const { slots, loading, error, lastFetched, refresh } = useSlotStatus(visible)
</script>

<style>
.el-dialog.slot-status-dialog {
  background: linear-gradient(135deg, #20374e, #101e30);
  border: 1px solid #65849e;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 24px 90px #0009;
  --el-text-color-primary: #eef6ff;
  --el-text-color-regular: #b9cbdd;
}
.slot-status-dialog .el-dialog__title {
  font-size: 22px;
  letter-spacing: 2px;
}
.slot-status-dialog .el-dialog__body {
  max-height: calc(90vh - 85px);
  overflow-y: auto;
  font-size: 14px;
}
.slot-status-dialog .status-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.slot-status-dialog .status-toolbar .el-button {
  margin-left: auto;
}
.slot-status-dialog .update-time,
.slot-status-dialog .footnote {
  color: #9fb3c8;
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.7;
}
.slot-status-dialog .error {
  color: #ffb4a9;
  margin-top: 12px;
}
.slot-status-dialog .legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 13px;
}
.slot-status-dialog .legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.slot-status-dialog .legend i {
  width: 16px;
  height: 12px;
  display: inline-block;
  border-radius: 2px;
}
.slot-status-dialog .soil {
  background: #86745a;
}
.slot-status-dialog .excavated {
  background: #426579;
}
.slot-status-dialog .boundary {
  background: #80efd7;
  height: 3px !important;
}
.slot-status-dialog .footnote {
  text-align: center;
}
</style>
