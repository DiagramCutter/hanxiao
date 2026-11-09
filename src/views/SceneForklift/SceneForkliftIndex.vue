<template>
  <div class="construction-dashboard">
    <header class="dashboard-header">
      <span class="demo-badge" title="新浆和累计换浆量仍为演示数据，其余数据面板已接入接口"
        ><i></i>部分演示数据</span
      >
      <div class="platform-title"><h1>智能防渗墙管控平台</h1></div>
      <div class="header-meta">
        <time>{{ date }}</time
        ><span>中国水电基础局有限公司</span>
      </div>
    </header>

    <main class="dashboard-grid">
      <aside class="left-panel" aria-label="回浆与清孔数据">
        <MudMonitoringPanel
          title="回浆监测"
          :caption="mudCaption"
          :data="returnMud"
          :loading="mudLoading"
          :error="mudError"
        />

        <section
          class="dashboard-panel progress-panel"
          aria-labelledby="cleaning-progress-title"
          :aria-busy="progressLoading"
        >
          <div class="section-heading">
            <h2 id="cleaning-progress-title">清孔进度</h2>
            <span
              class="section-caption"
              :class="{ 'has-error': progressError }"
              :title="progressError || progressCaption"
              role="status"
              >{{ progressCaption }}</span
            >
          </div>
          <p class="progress-explanation">清孔孔深 / 终孔深度</p>
          <div v-for="hole in holeProgress" :key="hole.pileName" class="progress-item">
            <div class="progress-label">
              <span :class="{ active: hole.pileName === currentHole.pileName }">{{
                hole.displayName
              }}</span>
              <strong :title="hole.progressPercent === null ? '暂无清孔进度' : undefined"
                >{{ hole.progressPercent ?? '--' }}<small>%</small></strong
              >
            </div>
            <div
              class="progress-track"
              role="progressbar"
              :aria-label="`${hole.displayName} 清孔进度`"
              :aria-valuenow="hole.progressPercent ?? undefined"
              :aria-valuetext="
                hole.progressPercent === null
                  ? '暂无清孔进度'
                  : `${hole.progressPercent}%，${hole.currentDepthM} / ${hole.finalDepthM} 米`
              "
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <i :style="{ width: (hole.progressPercent ?? 0) + '%' }"></i>
            </div>
            <span class="progress-depth"
              >{{ hole.currentDepthM ?? '--' }} / {{ hole.finalDepthM ?? '--' }} m</span
            >
          </div>
        </section>

        <section
          class="dashboard-panel volume-panel"
          aria-labelledby="slurry-volume-title"
          :aria-busy="volumeLoading"
        >
          <div class="section-heading">
            <h2 id="slurry-volume-title">泥浆储量</h2>
            <span
              class="section-caption"
              :class="{ 'has-error': volumeError }"
              :title="volumeError || volumeCaption"
              role="status"
              >{{ volumeCaption }}</span
            >
          </div>
          <dl class="volume-list">
            <div v-for="item in slurryVolumes" :key="item.id" :data-field="item.id">
              <dt><i></i>{{ item.name }}</dt>
              <dd :title="item.value === '--' ? '暂无数据' : undefined">
                {{ item.value }}<small>m³</small>
              </dd>
            </div>
          </dl>
        </section>

        <section class="dashboard-panel replacement-panel" aria-label="累计换浆量">
          <span class="replacement-icon"><DashboardIcon name="chart" /></span>
          <div>
            <h2>累计换浆量</h2>
            <strong>{{ dashboard.cumulativeReplacementM3 }}<small>m³</small></strong>
          </div>
        </section>
      </aside>

      <section class="center-column" aria-label="清孔概况与三维总览">
        <div
          class="dashboard-panel kpi-strip"
          :aria-busy="drillingLoading"
          :title="drillingError || undefined"
        >
          <div class="kpi" data-metric="current-hole">
            <span class="kpi-symbol"><DashboardIcon name="book" /></span>
            <div>
              <span
                >清孔孔位<em class="kpi-status" :class="{ warning: drillingError }" role="status">{{
                  drillingCaption
                }}</em></span
              ><strong class="hole-code">{{ currentHole.code ?? '--' }}</strong>
            </div>
          </div>
          <div class="kpi" data-metric="current-depth">
            <span class="kpi-symbol"><DashboardIcon name="layers" /></span>
            <div>
              <span>当前孔深</span
              ><strong>{{ currentHole.depthM ?? '--' }}<small>m</small></strong>
            </div>
          </div>
          <div class="kpi" data-metric="dwell-time">
            <span class="kpi-symbol"><DashboardIcon name="target" /></span>
            <div>
              <span
                >停留时长<em
                  class="kpi-status"
                  :class="{ warning: currentHole.dwellMinutes === null }"
                  role="status"
                  >{{ stayCaption }}</em
                ></span
              ><strong>{{ currentHole.dwellMinutes ?? '--' }}<small>min</small></strong>
            </div>
          </div>
        </div>

        <section class="dashboard-panel scene-panel">
          <div class="scene-heading">
            <div class="section-heading">
              <h2>施工现场<span class="heading-divider">·</span>三维总览</h2>
              <span class="connection" :class="{ warning: !modelLoaded }"
                ><i></i>{{ modelLoaded ? '已载入' : '载入中' }}</span
              >
            </div>
            <div class="scene-actions">
              <button
                class="quiet-button"
                :aria-pressed="enhancedRendering"
                :title="
                  enhancedRendering
                    ? '关闭增强，对比原始光照与材质'
                    : '开启光照、材质和接触阴影增强'
                "
                @click="enhancedRendering = !enhancedRendering"
              >
                <DashboardIcon name="eye" />画质增强
              </button>
              <span class="view-badge"><DashboardIcon name="cube" />俯视</span>
              <button class="quiet-button" @click="modelRef?.resetView()">
                <DashboardIcon name="target" />复位
              </button>
              <button
                class="quiet-button"
                :aria-pressed="showEnvironment"
                @click="showEnvironment = !showEnvironment"
              >
                <DashboardIcon name="layers" />绿化
              </button>
            </div>
          </div>
          <div class="scene-body">
            <ForkliftModel
              ref="modelRef"
              :pile-name="modelPreviewData.pileName"
              :selected-code="null"
              :slots="modelPreviewData.slots"
              :environment="showEnvironment"
              :show-labels="true"
              :enhanced="enhancedRendering"
              @loaded="modelLoaded = $event"
            />
          </div>
        </section>
      </section>

      <aside class="right-panel" aria-label="新浆与视频监控">
        <MudMonitoringPanel title="新浆监测" caption="演示数据" :data="dashboard.freshMud" />
        <section class="dashboard-panel system-panel" aria-labelledby="transport-system-title">
          <div class="section-heading">
            <h2 id="transport-system-title">泥浆输送视频监控</h2>
          </div>
          <div class="system-placeholder">
            <div class="placeholder-icon"><DashboardIcon name="video" /></div>
            <strong>监控画面待接入</strong>
            <p>泥浆输送区域实时监控</p>
            <span class="placeholder-label">海康威视</span>
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import ForkliftModel from './ForkliftModel.vue'
import DashboardIcon from './DashboardIcon.vue'
import MudMonitoringPanel from './MudMonitoringPanel.vue'
import { useSceneMud } from './useSceneMud'
import { useSceneMudSystem } from './useSceneMudSystem'
import { useSceneDrilling } from './useSceneDrilling'
import { useSceneProgress } from './useSceneProgress'
import { cleaningDashboardData as dashboard, modelPreviewData } from './cleaningDashboardData'

const {
  mudData: returnMud,
  caption: mudCaption,
  loading: mudLoading,
  error: mudError,
} = useSceneMud()

const {
  storageItems: slurryVolumes,
  caption: volumeCaption,
  loading: volumeLoading,
  error: volumeError,
} = useSceneMudSystem()

const {
  currentHole,
  caption: drillingCaption,
  stayCaption,
  loading: drillingLoading,
  error: drillingError,
} = useSceneDrilling()

const {
  holeProgress,
  caption: progressCaption,
  loading: progressLoading,
  error: progressError,
} = useSceneProgress()

const modelRef = ref<InstanceType<typeof ForkliftModel> | null>(null)
const modelLoaded = ref(false)
const showEnvironment = ref(true)
const enhancedRendering = ref(true)
const now = ref(Date.now())
const date = computed(() => dayjs(now.value).format('YYYY/MM/DD HH:mm:ss'))
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped src="@/views/SceneForklift/sceneDashboard.css"></style>
