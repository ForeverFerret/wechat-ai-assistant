<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-2">
        <span class="inline-flex p-2 bg-emerald-50 text-emerald-600 rounded-xl">
          <CalendarClock :size="20" />
        </span>
        <h2 class="font-bold text-slate-800 text-lg">提醒任务时间线</h2>
        <span class="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
          {{ tasks.length }}
        </span>
      </div>

      <!-- 过滤标签 -->
      <div class="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          @click="currentFilter = tab.value"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
            currentFilter === tab.value
              ? 'bg-white text-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 列表展示 -->
    <div v-if="filteredTasks.length === 0" class="py-12 text-center text-slate-400">
      <Inbox :size="48" class="mx-auto mb-2.5 opacity-30 stroke-1" />
      <p class="text-sm">暂无对应的提醒任务</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="group relative flex items-start justify-between p-4 rounded-xl border transition-all"
        :class="[
          task.status === 'pending'
            ? 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-xs'
            : task.status === 'sent'
            ? 'bg-slate-50/60 border-slate-100 opacity-80'
            : 'bg-slate-50/30 border-slate-100 opacity-50'
        ]"
      >
        <div class="flex items-start gap-3">
          <!-- 状态指示图标 -->
          <div class="mt-0.5">
            <span
              v-if="task.status === 'pending'"
              class="inline-flex p-1.5 rounded-lg bg-indigo-50 text-indigo-600"
            >
              <Clock :size="16" />
            </span>
            <span
              v-else-if="task.status === 'sent'"
              class="inline-flex p-1.5 rounded-lg bg-emerald-50 text-emerald-600"
            >
              <CheckCircle2 :size="16" />
            </span>
            <span
              v-else
              class="inline-flex p-1.5 rounded-lg bg-slate-100 text-slate-400"
            >
              <XCircle :size="16" />
            </span>
          </div>

          <!-- 任务内容与时间 -->
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-bold px-2 py-0.5 rounded-md"
                :class="
                  task.target_name === '我'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-purple-50 text-purple-700'
                "
              >
                {{ task.target_name === '我' ? '👤 发给自己' : `📱 给：${task.target_name}` }}
              </span>
              <span class="text-xs font-mono font-medium text-slate-400">
                {{ formatDateTime(task.trigger_time) }}
              </span>
            </div>

            <p class="font-bold text-slate-800 text-base">
              {{ task.content }}
            </p>

            <p v-if="task.raw_input" class="text-xs text-slate-400 mt-1">
              语音原话：“{{ task.raw_input }}”
            </p>
            <p v-if="task.status === 'failed' && task.error_message" class="text-xs text-rose-500 mt-1">
              推送异常：{{ task.error_message }}
            </p>
          </div>
        </div>

        <!-- 操作区 -->
        <div class="flex items-center gap-2">
          <!-- 状态标签 -->
          <span
            v-if="task.status === 'pending'"
            class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 flex items-center gap-1"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            排程等待中
          </span>
          <span
            v-else-if="task.status === 'sent'"
            class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600"
          >
            已送达微信
          </span>
          <span
            v-else
            class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400"
          >
            已撤销
          </span>

          <!-- 撤销按钮 (仅针对待触发) -->
          <button
            v-if="task.status === 'pending'"
            @click="handleCancel(task.id)"
            class="text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
            title="取消本次提醒"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CalendarClock, Clock, CheckCircle2, XCircle, Trash2, Inbox } from 'lucide-vue-next';
import { Task, cancelTask } from '../api';

const props = defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits<{
  (e: 'task-updated'): void;
}>();

const currentFilter = ref('all');

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待触发', value: 'pending' },
  { label: '已送达', value: 'sent' },
  { label: '已撤销', value: 'cancelled' },
];

const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return props.tasks;
  return props.tasks.filter((t) => t.status === currentFilter.value);
});

function formatDateTime(timeStr: string) {
  return timeStr;
}

async function handleCancel(id: number) {
  if (!confirm('确定要取消这条定时提醒吗？')) return;
  const ok = await cancelTask(id);
  if (ok) {
    emit('task-updated');
  } else {
    alert('取消失败');
  }
}
</script>
