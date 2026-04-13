<template>
  <div class="history-container">
    <h3>问答历史</h3>
    <div class="history-list">
      <div 
        class="history-item"
        v-for="(item, index) in ragStore.qaHistory"
        :key="index"
        @click="showHistory(item)"
      >
        <p>问：{{ item.question }}</p>
        <p style="font-size: 12px; color: #666; margin-top: 4px;">答：{{ item.answer.slice(0, 30) }}...</p>
      </div>
      <p v-if="!ragStore.qaHistory.length" style="font-size: 12px; color: #999;">暂无问答历史</p>
    </div>
  </div>
</template>

<script setup>
import { useRagStore } from '../store/ragStore'

const ragStore = useRagStore()

// 显示历史问答详情（后续完善，此处先占位）
const showHistory = (item) => {
  alert(`问题：${item.question}\n回答：${item.answer}`)
}
</script>