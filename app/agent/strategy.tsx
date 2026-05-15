import { useMemo, useState } from 'react'
import { router } from 'expo-router'
import { BrainCircuit, Route, Sparkles } from 'lucide-react-native'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme } from '../../src/design-system/theme'
import { useCreateStrategyProposal } from '../../src/features/agent/hooks/useStrategyProposal'
import { isApiConfigured } from '../../src/services/api/httpClient'

export default function AgentStrategyScreen() {
  const [prompt, setPrompt] = useState(
    '帮我分析资产组合风险，并生成一个需要授权的稳健调仓建议。',
  )
  const createProposal = useCreateStrategyProposal()
  const backendConfigured = isApiConfigured()
  const canCreate = useMemo(
    () =>
      backendConfigured &&
      prompt.trim().length > 0 &&
      !createProposal.isPending,
    [backendConfigured, createProposal.isPending, prompt],
  )

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="AI 策略"
        title="策略构建器"
        description="先把用户意图转成可审阅计划，再进入交易提案或钱包动作。"
        statusLabel="草案"
        statusTone="purple"
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              意图输入
            </AppText>
            <AppText variant="section">围绕资产组合生成策略</AppText>
          </View>
          <BrainCircuit color={theme.colors.violet} size={22} />
        </View>
        <TextInput
          editable={backendConfigured}
          multiline
          onChangeText={setPrompt}
          placeholder="例如：分析我的资产风险，并给出稳健调仓建议。"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.promptInput}
          value={prompt}
        />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              规划阶段
            </AppText>
            <AppText variant="section">后端受控草案</AppText>
          </View>
          <Route color={theme.colors.goldBright} size={22} />
        </View>
        <MetricRow
          label="模块 API"
          value={backendConfigured ? '已配置' : '未配置'}
          valueColor={backendConfigured ? 'goldBright' : 'textMuted'}
        />
        <MetricRow label="意图识别" value="等待 AI 后端" />
        <MetricRow label="市场上下文" value="等待 OKX 数据" />
        <MetricRow label="风控过滤" value="必需" valueColor="goldBright" />
        <MetricRow label="提案输出" value="仅审阅" />
      </TerminalCard>

      {createProposal.data ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            策略草案
          </AppText>
          <AppText variant="section">意图卡片已创建</AppText>
          <MetricRow label="提案" value={createProposal.data.id} />
          <MetricRow
            label="识别信心"
            value={formatConfidence(createProposal.data.confidence)}
            valueColor="textMuted"
          />
          <AppText color="textSecondary">
            后端已将它记录为仅审阅卡片。没有完整提案和用户明确授权，不会执行交易。
          </AppText>
        </TerminalCard>
      ) : null}

      {createProposal.isError ? (
        <TerminalCard style={styles.card}>
          <AppText variant="caption" color="goldBright">
            策略草案
          </AppText>
          <AppText variant="section">模块 API 不可用</AppText>
          <AppText color="textSecondary">
            AI 策略服务没有接收草案。请检查后端服务和 API 地址配置。
          </AppText>
        </TerminalCard>
      ) : null}

      <Button
        fullWidth
        disabled={!canCreate}
        onPress={() =>
          createProposal.mutate({
            prompt: prompt.trim(),
          })
        }
      >
        {createProposal.isPending ? '正在创建草案' : '创建策略卡片'}
      </Button>
      <Button
        fullWidth
        variant="secondary"
        onPress={() => router.push('/agent/execution-confirm')}
      >
        预览授权门
      </Button>
      <Button variant="ghost" fullWidth onPress={() => router.back()}>
        返回
      </Button>

      <Sparkles color={theme.colors.borderMuted} size={1} />
    </ScrollView>
  )
}

function formatConfidence(confidence: string) {
  if (confidence === 'high') {
    return '高'
  }

  if (confidence === 'medium') {
    return '中'
  }

  if (confidence === 'low') {
    return '低'
  }

  return confidence
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingTop: 72,
    paddingBottom: 48,
    backgroundColor: theme.colors.background,
  },
  card: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  promptInput: {
    minHeight: 116,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    padding: theme.spacing.lg,
    textAlignVertical: 'top',
  },
})
