<script setup>
import { onMounted } from 'vue'
import DocumentUpload from '../components/DocumentUpload.vue'
import QaChat from '../components/QaChat.vue'
import { useRagStore } from '../store/ragStore'

const ragStore = useRagStore()
onMounted(() => ragStore.init())
</script>

<template>
  <div class="app-container">
    <DocumentUpload />
    <div class="middle-container">
      <QaChat />
    </div>
  </div>
</template>
