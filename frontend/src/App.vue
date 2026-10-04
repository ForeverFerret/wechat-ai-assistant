<template>
  <div class="max-w-3xl mx-auto px-4 py-6 md:py-10">
    <!-- 顶部导航栏 -->
    <header class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100 text-2xl">
          🤖
        </div>
        <div>
          <h1 class="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            微信AI助手
            <span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
              全天候在线
            </span>
          </h1>
          <p class="text-xs text-slate-400 font-medium">
            北京时间：{{ currentTime }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- 成员管理按钮 -->
        <button
          @click="showUserModal = true"
          class="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
        >
          <Users :size="15" class="text-indigo-600" />
          <span>成员管理 ({{ users.length }})</span>
        </button>

        <!-- 刷新按钮 -->
        <button
          @click="refreshData"
          class="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-500 hover:text-slate-800 shadow-2xs transition cursor-pointer"
          title="刷新数据"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </div>
    </header>

    <!-- 成员快捷徽章 -->
    <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
      <span class="text-xs text-slate-400 font-medium shrink-0">微信接收方:</span>
      <span
        v-for="u in users"
        :key="u.id"
        class="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 flex items-center gap-1 shrink-0"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {{ u.name }}
      </span>
      <button
        @click="showUserModal = true"
        class="text-xs font-semibold px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition shrink-0 cursor-pointer"
      >
        + 绑定新微信
      </button>
    </div>

    <!-- 主交互区域 -->
    <main class="space-y-6">
      <!-- 语音录制与解析卡片 -->
      <VoiceRecorder :users="users" @task-created="refreshData" />

      <!-- 任务时间线列表 -->
      <TaskTimeline :tasks="tasks" @task-updated="refreshData" />
    </main>

    <!-- 底部版权信息与运行环境说明 -->
    <footer class="mt-12 text-center text-xs text-slate-400 space-y-1">
      <p>微信AI助手 · 基于 Cloudflare Serverless 与 Google Gemini 构建</p>
      <p>任务由云端定时器自主执行，电脑和手机关机无忧</p>
    </footer>

    <!-- 成员管理弹窗 -->
    <UserModal
      v-if="showUserModal"
      :users="users"
      @close="showUserModal = false"
      @updated="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Users, RefreshCw } from 'lucide-vue-next';
import VoiceRecorder from './components/VoiceRecorder.vue';
import TaskTimeline from './components/TaskTimeline.vue';
import UserModal from './components/UserModal.vue';
import { User, Task, getUsers, getTasks } from './api';

const users = ref<User[]>([]);
const tasks = ref<Task[]>([]);
const showUserModal = ref(false);
const isRefreshing = ref(false);
const currentTime = ref('');

let clockTimer: any = null;
let pollTimer: any = null;

function updateClock() {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const mm = String(beijing.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(beijing.getUTCDate()).padStart(2, '0');
  const hh = String(beijing.getUTCHours()).padStart(2, '0');
  const min = String(beijing.getUTCMinutes()).padStart(2, '0');
  const ss = String(beijing.getUTCSeconds()).padStart(2, '0');
  currentTime.value = `${mm}月${dd}日 ${hh}:${min}:${ss}`;
}

async function refreshData() {
  isRefreshing.value = true;
  try {
    const [userList, taskList] = await Promise.all([getUsers(), getTasks()]);
    users.value = userList;
    tasks.value = taskList;
  } catch (err) {
    console.error('拉取数据失败:', err);
  } finally {
    isRefreshing.value = false;
  }
}

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  refreshData();
  // 每 15 秒静默轮询最新任务状态
  pollTimer = setInterval(refreshData, 15000);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (pollTimer) clearInterval(pollTimer);
});
</script>


