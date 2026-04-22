<template>
  <div class="telemetry-panel" v-if="visible">
    <div class="header">
      <span>埋点调试</span>
      <div class="actions">
        <button @click="refresh">刷新</button>
        <button @click="clearAll">清空</button>
      </div>
    </div>
    <div class="list">
      <div v-if="events.length === 0" class="empty">暂无埋点数据</div>
      <div v-for="(item, idx) in events" :key="`${item.ts}-${idx}`" class="item">
        <div class="line">
          <strong>{{ item.name }}</strong>
          <span>{{ formatTime(item.ts) }}</span>
        </div>
        <div class="meta">
          <span v-if="item.mode">mode: {{ item.mode }}</span>
          <span v-if="item.durationMs !== undefined">耗时: {{ item.durationMs }}ms</span>
          <span v-if="item.status !== undefined">status: {{ item.status }}</span>
          <span v-if="item.fallback !== undefined">fallback: {{ item.fallback ? 'yes' : 'no' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { getTelemetryEvents, clearTelemetryEvents } from '../../utils/tools/telemetry.js'

const props = defineProps({
  visible: { type: Boolean, default: true },
})

const events = ref([])
let timer = null

const refresh = () => {
  events.value = getTelemetryEvents(30).reverse()
}

const clearAll = () => {
  clearTelemetryEvents()
  refresh()
}

const formatTime = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped lang="scss">
.telemetry-panel {
  position: fixed;
  right: 14px;
  bottom: 14px;
  width: 320px;
  max-height: 42vh;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 999;
}
.header {
  height: 36px;
  border-bottom: 1px solid var(--border);
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.actions {
  display: flex;
  gap: 6px;
  button {
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-secondary);
    border-radius: 6px;
    font-size: 11px;
    padding: 2px 6px;
    cursor: pointer;
  }
}
.list { max-height: calc(42vh - 36px); overflow: auto; padding: 8px 10px; }
.empty { font-size: 12px; color: var(--text-secondary); }
.item { padding: 6px 0; border-bottom: 1px dashed var(--border); }
.line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
