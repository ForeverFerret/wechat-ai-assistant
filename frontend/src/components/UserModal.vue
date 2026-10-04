<template>
  <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-up">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div class="flex items-center gap-2">
          <Users :size="20" class="text-indigo-600" />
          <h3 class="font-bold text-slate-800 text-lg">家庭成员与好友绑定</h3>
        </div>
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- 微信扫码关注卡片 -->
      <div class="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-2xl p-5 mb-5 text-center">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 mb-3 shadow-2xs">
          <QrCode :size="14" />
          <span>第 1 步：用手机微信扫码关注</span>
        </div>

        <!-- 二维码主体卡片 -->
        <div class="relative w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl shadow-md border border-slate-100 flex items-center justify-center group mb-3">
          <img
            src="/wechat_qrcode.png"
            alt="微信测试号关注二维码"
            class="w-full h-full object-contain rounded-xl"
          />
        </div>

        <p class="text-xs font-bold text-slate-700 mb-1">
          请让父亲、母亲或朋友用微信扫描上方二维码
        </p>
        <p class="text-[11px] text-slate-400 mb-3">
          扫码关注后，该微信号即可一对一接收专属模板提醒消息
        </p>

        <!-- 步骤指引 -->
        <div class="bg-white/80 border border-indigo-100/60 rounded-xl p-3 text-left space-y-1.5 text-xs text-slate-600">
          <div class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>在电脑打开 <a href="https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login" target="_blank" class="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5">微信测试号管理后台 <ExternalLink :size="11" /></a>；</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>在右侧“用户列表”找到新增的 <strong>微信号 (OpenID)</strong>，复制并填入下方绑定！</span>
          </div>
        </div>
      </div>


      <!-- 现有成员列表 -->
      <div class="mb-5">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          已登记成员 ({{ users.length }})
        </h4>

        <div class="space-y-2">
          <div
            v-for="u in users"
            :key="u.id"
            class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-xl"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-800">{{ u.name }}</span>
                <span v-if="u.is_default" class="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                  默认
                </span>
                <span v-if="u.aliases" class="text-xs text-slate-400">
                  别名: {{ u.aliases }}
                </span>
              </div>
              <p class="text-xs font-mono text-slate-400 mt-0.5">
                {{ u.openid }}
              </p>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                @click="handleTestPush(u.openid, u.name)"
                :disabled="isTesting"
                class="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                title="发送微信测试消息"
              >
                测试微信
              </button>
              <button
                v-if="!u.is_default"
                @click="handleDelete(u.id)"
                class="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                title="删除成员"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增成员表单 -->
      <div class="border-t border-slate-100 pt-4">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          添加新成员
        </h4>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">成员称谓 (如: 母亲, 父亲, 小王)</label>
            <input
              v-model="form.name"
              placeholder="例如：母亲"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">口语别名 (逗号分隔，方便语音识别)</label>
            <input
              v-model="form.aliases"
              placeholder="例如：妈妈,老妈,母上"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">对应微信 OpenID (测试号关注后获得)</label>
            <input
              v-model="form.openid"
              placeholder="例如：ob9no23o6zOS_..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            @click="handleAddUser"
            :disabled="!form.name || !form.openid || isSaving"
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition cursor-pointer"
          >
            {{ isSaving ? '保存中...' : '确认添加绑定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Users, X, QrCode, Trash2, ExternalLink } from 'lucide-vue-next';
import { User, saveUser, deleteUser, testPush } from '../api';


const props = defineProps<{
  users: User[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated'): void;
}>();

const isSaving = ref(false);
const isTesting = ref(false);

const form = reactive({
  name: '',
  aliases: '',
  openid: '',
});

async function handleAddUser() {
  if (!form.name || !form.openid) return;
  isSaving.value = true;
  try {
    const ok = await saveUser({
      name: form.name.trim(),
      aliases: form.aliases.trim() || undefined,
      openid: form.openid.trim(),
    });
    if (ok) {
      form.name = '';
      form.aliases = '';
      form.openid = '';
      emit('updated');
    } else {
      alert('保存失败');
    }
  } catch (err: any) {
    alert(`添加异常: ${err.message}`);
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete(id: number) {
  if (!confirm('确定要删除该成员绑定吗？')) return;
  const ok = await deleteUser(id);
  if (ok) {
    emit('updated');
  }
}

async function handleTestPush(openid: string, name: string) {
  isTesting.value = true;
  try {
    const res = await testPush(openid, `这是一条发给【${name}】的微信AI助手联通性测试 ☕`);
    if (res.success) {
      alert(`🎉 测试推送成功！请让【${name}】查看微信。`);
    } else {
      alert(`测试推送失败: ${res.error}`);
    }
  } catch (err: any) {
    alert(`网络请求异常: ${err.message}`);
  } finally {
    isTesting.value = false;
  }
}
</script>
