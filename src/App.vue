<template>
  <router-view />
  <Toast />
  <ConfirmDialog />
</template>

<script setup>
import Toast from './components/common/Toast.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
</script>
