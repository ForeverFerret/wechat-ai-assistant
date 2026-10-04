<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 transition-all">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="inline-flex p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Mic :size="20" />
        </span>
        <h2 class="font-bold text-slate-800 text-lg">AI 语音录入</h2>
      </div>
      <span class="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
        普通话识别 + Gemini 解析
      </span>
    </div>

    <!-- 录音大按钮区 -->
    <div class="flex flex-col items-center justify-center my-6">
      <div class="relative flex items-center justify-center">
        <!-- 录音中波纹扩散动效 -->
        <div
          v-if="isRecording"
          class="absolute w-28 h-28 bg-indigo-400/20 rounded-full animate-ping"
        ></div>
        <div
          v-if="isRecording"
          class="absolute w-24 h-24 bg-indigo-500/30 rounded-full animate-pulse"
        ></div>

        <!-- 录音按钮 -->
        <button
          @click="toggleRecording"
          :disabled="isParsing"
          :class="[
            'relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer',
            isRecording
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
            isParsing ? 'opacity-50 cursor-not-allowed' : ''
          ]"
        >
          <Mic v-if="!isRecording" :size="32" />
          <Square v-else :size="28" class="animate-pulse" />
        </button>
      </div>

      <p class="mt-4 text-sm font-medium text-slate-600">
        <span v-if="isRecording" class="text-rose-500 font-semibold animate-pulse">正在倾听中... 点击按钮结束</span>
        <span v-else-if="isParsing" class="text-indigo-600 font-semibold animate-pulse">AI 正在深度理解指令...</span>
        <span v-else class="text-slate-500">点击麦克风，说出你的提醒（如“5分钟后提醒我喝水”）</span>
      </p>

      <!-- 实时转写文字展示 -->
      <div
        v-if="interimText || transcript"
        class="mt-3 px-4 py-2 bg-indigo-50/50 border border-indigo-100/60 rounded-xl text-sm text-indigo-900 max-w-md text-center"
      >
        “{{ interimText || transcript }}”
      </div>
    </div>

    <!-- 文字输入备用折叠区 -->
    <div class="border-t border-slate-100 pt-4 mt-2">
      <div class="flex gap-2">
        <input
          v-model="textInput"
          @keyup.enter="handleManualSubmit"
          placeholder="也可以直接打字输入，例如：明天早上9点提醒妈妈吃药"
          :disabled="isParsing"
          class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
        />
        <button
          @click="handleManualSubmit"
          :disabled="!textInput.trim() || isParsing"
          class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles :size="16" />
          <span>解析</span>
        </button>
      </div>
    </div>

    <!-- AI 解析确认卡片 -->
    <div
      v-if="parsedCard"
      class="mt-5 p-5 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border-2 border-indigo-200 rounded-2xl shadow-sm animate-fade-in"
    >
      <div class="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2.5">
        <div class="flex items-center gap-2">
          <Sparkles :size="18" class="text-indigo-600" />
          <h3 class="font-bold text-slate-800 text-base">AI 意图解析结果</h3>
        </div>
        <span
          class="text-xs px-2 py-0.5 rounded-full font-medium"
          :class="parsedCard.confidence > 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
        >
          置信度 {{ Math.round(parsedCard.confidence * 100) }}%
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <!-- 提醒对象 -->
        <div class="bg-white/80 p-3 rounded-xl border border-indigo-100">
          <label class="text-xs font-medium text-slate-400 block mb-1">提醒对象 (微信接收人)</label>
          <select
            v-model="parsedCard.target_name"
            @change="handleTargetChange"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="user in users" :key="user.id" :value="user.name">
              {{ user.name }} ({{ user.aliases || '默认' }})
            </option>
          </select>
        </div>

        <!-- 触发时间 -->
        <div class="bg-white/80 p-3 rounded-xl border border-indigo-100">
          <label class="text-xs font-medium text-slate-400 block mb-1">预定提醒时间</label>
          <input
            v-model="parsedCard.trigger_time"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>

        <!-- 提醒事项 -->
        <div class="bg-white/80 p-3 rounded-xl border border-indigo-100 md:col-span-1">
          <label class="text-xs font-medium text-slate-400 block mb-1">微信推送内容</label>
          <input
            v-model="parsedCard.content"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5">
        <button
          @click="parsedCard = null"
          class="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium transition cursor-pointer"
        >
          放弃重录
        </button>
        <button
          @click="confirmCreateTask"
          :disabled="isSubmitting"
          class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Check :size="16" />
          <span>{{ isSubmitting ? '正在写入...' : '确认创建并排程' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Mic, Square, Sparkles, Check } from 'lucide-vue-next';
import { User, ParsedResult, parseInput, createTask } from '../api';

const props = defineProps<{
  users: User[];
}>();

const emit = defineEmits<{
  (e: 'task-created'): void;
}>();

const isRecording = ref(false);
const isParsing = ref(false);
const isSubmitting = ref(false);
const transcript = ref('');
const interimText = ref('');
const textInput = ref('');
const parsedCard = ref<ParsedResult | null>(null);

let recognition: any = null;

// 初始化语音识别对象
function initSpeechRecognition() {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('当前浏览器暂未原生支持语音识别接口，建议使用 Chrome / Edge 或微信内置浏览器，亦可使用下方输入框直接打字。');
    return null;
  }

  const rec = new SpeechRecognition();
  rec.lang = 'zh-CN';
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if (final) {
      transcript.value = final;
    }
    interimText.value = interim;
  };

  rec.onerror = (event: any) => {
    console.error('语音识别异常:', event.error);
    isRecording.value = false;
  };

  rec.onend = () => {
    isRecording.value = false;
    const fullText = transcript.value || interimText.value;
    if (fullText.trim()) {
      executeParse(fullText.trim());
    }
  };

  return rec;
}

function toggleRecording() {
  if (isRecording.value) {
    if (recognition) {
      recognition.stop();
    }
    isRecording.value = false;
  } else {
    transcript.value = '';
    interimText.value = '';
    parsedCard.value = null;

    if (!recognition) {
      recognition = initSpeechRecognition();
    }

    if (recognition) {
      try {
        recognition.start();
        isRecording.value = true;
      } catch (err) {
        console.error('启动麦克风失败:', err);
      }
    }
  }
}

async function executeParse(text: string) {
  isParsing.value = true;
  try {
    const res = await parseInput(text);
    parsedCard.value = res;
  } catch (err: any) {
    alert(`解析失败: ${err.message}`);
  } finally {
    isParsing.value = false;
  }
}

function handleManualSubmit() {
  if (!textInput.value.trim() || isParsing.value) return;
  const text = textInput.value.trim();
  transcript.value = text;
  textInput.value = '';
  executeParse(text);
}

function handleTargetChange() {
  if (!parsedCard.value) return;
  const user = props.users.find((u) => u.name === parsedCard.value?.target_name);
  if (user) {
    parsedCard.value.target_openid = user.openid;
  }
}

async function confirmCreateTask() {
  if (!parsedCard.value) return;
  isSubmitting.value = true;

  try {
    const success = await createTask({
      target_name: parsedCard.value.target_name,
      target_openid: parsedCard.value.target_openid,
      content: parsedCard.value.content,
      trigger_time: parsedCard.value.trigger_time,
      raw_input: transcript.value,
    });

    if (success) {
      parsedCard.value = null;
      transcript.value = '';
      interimText.value = '';
      emit('task-created');
    } else {
      alert('创建任务失败，请检查网络后重试');
    }
  } catch (err: any) {
    alert(`创建任务出错: ${err.message}`);
  } finally {
    isSubmitting.value = false;
  }
}
</script>
