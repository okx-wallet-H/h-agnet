import { router } from 'expo-router'
import {
  CheckCircle2,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  WalletCards,
} from 'lucide-react-native'
import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { AppText } from '../../src/components/primitives/AppText'
import { Button } from '../../src/components/primitives/Button'
import { StatusPill } from '../../src/components/primitives/StatusPill'
import { MetricRow } from '../../src/components/terminal/MetricRow'
import { ScreenHeader } from '../../src/components/terminal/ScreenHeader'
import { TerminalCard } from '../../src/components/terminal/TerminalCard'
import { theme, useAppTheme, type AppTheme } from '../../src/design-system/theme'
import { useOkxIntegrationStatus } from '../../src/features/okx/hooks/useOkxIntegrationStatus'
import { isApiConfigured } from '../../src/services/api/httpClient'
import type {
  OkxIntegrationCapability,
  OkxIntegrationCapabilityStatus,
  OkxIntegrationDomain,
  OkxIntegrationDomainStatus,
  OkxProviderAdapterStatus,
} from '../../src/services/okx/types'

export default function OkxSettingsScreen() {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])
  const integration = useOkxIntegrationStatus()
  const status = integration.data
  const agentWalletReady = status?.agentWallet.status === 'ready'
  const apiConfigured = isApiConfigured()

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="OKX / OnchainOS"
        title="集成准备"
        description="H Wallet 前端只连接自己的 API。OKX、OnchainOS、CLI 和密钥都必须留在服务端适配层。"
        statusLabel={agentWalletReady ? 'Agent Wallet 已就绪' : '等待配置'}
        statusTone={agentWalletReady ? 'success' : 'muted'}
      />

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              H Wallet API
            </AppText>
            <AppText variant="section">
              {status?.apiPrefix ?? '/api/h/v1'}
            </AppText>
          </View>
          <ServerCog color={appTheme.colors.goldBright} size={22} />
        </View>
        <MetricRow
          label="前端 API"
          value={apiConfigured ? '已配置' : '未配置'}
          valueColor={apiConfigured ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="后端状态"
          value={
            integration.isError
              ? '读取失败'
              : integration.isLoading
                ? '读取中'
                : status
                  ? '已连接'
                  : '等待'
          }
          valueColor={status ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="接入通道"
          value={status?.officialChannel.label ?? 'H Wallet 官方 OKX 通道'}
          valueColor="goldBright"
        />
        <MetricRow
          label="交易授权"
          value="用户 Agent Wallet"
          valueColor="success"
        />
        <MetricRow label="密钥位置" value="仅服务端" valueColor="success" />
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              域边界
            </AppText>
            <AppText variant="section">Onchain 与 CEX 分离</AppText>
          </View>
          <ShieldCheck color={appTheme.colors.success} size={22} />
        </View>
        {(status?.domains ?? fallbackDomains).map((domain) => (
          <DomainRow key={domain.id} domain={domain} />
        ))}
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              Agent Wallet
            </AppText>
            <AppText variant="section">邮箱验证码登录</AppText>
          </View>
          <WalletCards color={appTheme.colors.violet} size={22} />
        </View>
        <MetricRow
          label="适配器"
          value={formatStatus(status?.agentWallet.status ?? 'not-configured')}
          valueColor={agentWalletReady ? 'goldBright' : 'textMuted'}
        />
        <MetricRow
          label="认证模式"
          value={status?.agentWallet.authMode ?? 'disabled'}
        />
        <AppText color="textMuted">
          {status?.agentWallet.reason ??
            '等待后端返回 OnchainOS Agent Wallet 适配状态。'}
        </AppText>
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              Provider Registry
            </AppText>
            <AppText variant="section">后端适配器边界</AppText>
          </View>
          <ServerCog color={appTheme.colors.goldBright} size={22} />
        </View>
        {(status?.providerAdapters ?? []).map((provider) => (
          <ProviderRow key={provider.id} provider={provider} />
        ))}
        {!status?.providerAdapters?.length ? (
          <AppText color="textMuted">
            等待后端返回 provider registry。
          </AppText>
        ) : null}
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              服务端环境
            </AppText>
            <AppText variant="section">联调前检查</AppText>
          </View>
          <ShieldCheck color={appTheme.colors.success} size={22} />
        </View>
        {(status?.serverEnvironment.required ?? fallbackRequirements).map(
          (item) => (
            <View key={item.name} style={styles.envItem}>
              <View style={styles.envCopy}>
                <AppText variant="data">{item.name}</AppText>
                <AppText variant="caption" color="textMuted">
                  {item.requiredFor}
                </AppText>
              </View>
              <StatusPill
                label={item.configured ? '已配置' : '未配置'}
                tone={item.configured ? 'success' : 'muted'}
              />
            </View>
          ),
        )}
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              能力开关
            </AppText>
            <AppText variant="section">当前开放范围</AppText>
          </View>
          <LockKeyhole color={appTheme.colors.goldBright} size={22} />
        </View>
        {(status?.capabilities ?? fallbackCapabilities).map((capability) => (
          <CapabilityRow key={capability.id} capability={capability} />
        ))}
      </TerminalCard>

      <TerminalCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="caption" color="goldBright">
              密钥规则
            </AppText>
            <AppText variant="section">不要把 OKX Key 放进前端</AppText>
          </View>
          <CheckCircle2 color={appTheme.colors.success} size={22} />
        </View>
        <AppText color="textSecondary">
          OKX API Key、OnchainOS CLI 会话、任何交易执行凭证都只能放在后端
          `.env` 或服务端安全存储。不要使用 EXPO_PUBLIC_ 暴露密钥。
        </AppText>
      </TerminalCard>

      <Button fullWidth onPress={() => router.back()}>
        返回
      </Button>
    </ScrollView>
  )
}

function CapabilityRow({
  capability,
}: {
  capability: OkxIntegrationCapability
}) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.capabilityItem}>
      <View style={styles.capabilityCopy}>
        <AppText variant="data">{capability.label}</AppText>
        <AppText variant="caption" color="textMuted">
          {capability.reason}
        </AppText>
        {capability.route ? (
          <AppText variant="caption" color="textMuted">
            {capability.route}
          </AppText>
        ) : null}
      </View>
      <StatusPill
        label={formatCapabilityStatus(capability.status)}
        tone={getCapabilityTone(capability.status)}
      />
    </View>
  )
}

function ProviderRow({ provider }: { provider: OkxProviderAdapterStatus }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.capabilityItem}>
      <View style={styles.capabilityCopy}>
        <AppText variant="data">{provider.label}</AppText>
        <AppText variant="caption" color="textMuted">
          {provider.requiredFor}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {provider.transport} · {provider.requiredEnv.join(' / ')}
        </AppText>
        <AppText variant="caption" color="goldBright">
          {provider.credentialLabel}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {provider.credentialUse}
        </AppText>
      </View>
      <StatusPill
        label={formatProviderStatus(provider.status)}
        tone={getProviderTone(provider.status)}
      />
    </View>
  )
}

function DomainRow({ domain }: { domain: OkxIntegrationDomain }) {
  const appTheme = useAppTheme()
  const styles = useMemo(() => createStyles(appTheme), [appTheme])

  return (
    <View style={styles.capabilityItem}>
      <View style={styles.capabilityCopy}>
        <AppText variant="data">{domain.label}</AppText>
        <AppText variant="caption" color="textMuted">
          {domain.scope}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {domain.rule}
        </AppText>
      </View>
      <StatusPill
        label={formatDomainStatus(domain.status)}
        tone={getDomainTone(domain.status)}
      />
    </View>
  )
}

const fallbackRequirements = [
  {
    name: 'H_AGENT_ONCHAINOS_AUTH_MODE',
    requiredFor: 'Agent Wallet 邮箱验证码登录',
    expected: 'cli',
    configured: false,
  },
  {
    name: 'ONCHAINOS_CLI_PATH',
    requiredFor: '服务端调用 onchainos wallet 命令',
    expected: '/absolute/path/to/onchainos',
    configured: false,
  },
  {
    name: 'OKX_PROJECT_ID',
    requiredFor: 'OKX OnchainOS Developer Project',
    expected: 'server-only',
    configured: false,
  },
  {
    name: 'OKX_API_KEY',
    requiredFor: '服务端调用 OKX Onchain Swap / OnchainOS Open API',
    expected: 'server-only',
    configured: false,
  },
  {
    name: 'OKX_SECRET_KEY',
    requiredFor: '服务端签名 OKX API 请求',
    expected: 'server-only',
    configured: false,
  },
  {
    name: 'OKX_PASSPHRASE',
    requiredFor: '服务端签名 OKX API 请求',
    expected: 'server-only',
    configured: false,
  },
]

const fallbackDomains: OkxIntegrationDomain[] = [
  {
    id: 'onchain',
    label: 'Onchain / OKX Wallet',
    status: 'active',
    scope: 'Agent Wallet、OnchainOS、DEX Swap、Bridge、Security、Wallet Portfolio',
    rule: '当前 H Wallet 主线，只通过后端 OnchainOS / OKX Wallet 适配层调用。',
  },
  {
    id: 'cex',
    label: 'CEX / OKX 交易所',
    status: 'future-separated',
    scope: '交易所余额、现货 / 合约订单、交易机器人、Earn、交易所账户配置',
    rule: '后续独立模块，不得混入 Agent Wallet 授权、Onchain 钱包资产或 DEX Swap 回执。',
  },
]

const fallbackCapabilities: OkxIntegrationCapability[] = [
  {
    id: 'agent-wallet-email-auth',
    label: '邮箱验证码创建 Agent 钱包',
    route: '/api/h/v1/auth/agent-wallet/request-otp',
    status: 'not-configured',
    reason: '等待服务端配置 OnchainOS CLI。',
  },
  {
    id: 'wallet-transfer-card',
    label: '提现 / 转账授权卡',
    route: '/api/h/v1/wallet/actions/transfer-draft',
    status: 'ready',
    reason: '当前只生成授权卡，不广播交易。',
  },
  {
    id: 'wallet-transfer-execution',
    label: '真实提现 / 转账执行',
    route: null,
    status: 'blocked',
    reason: '真实执行必须等待用户授权策略、风控和 OnchainOS 执行路径完成。',
  },
  {
    id: 'okx-swap-quote',
    label: 'OKX Swap Quote',
    route: '/api/h/v1/trading/proposals',
    status: 'blocked',
    reason: 'H Wallet 只保留编排入口；真实 quote 必须由服务端 OKX Swap 适配器返回。',
  },
  {
    id: 'okx-swap-execution',
    label: 'OKX Swap 执行',
    route: null,
    status: 'blocked',
    reason: '当前阶段不开放真实 swap；后续接 OKX Swap data、用户授权策略和交易状态回执。',
  },
]

function formatStatus(status: string) {
  if (status === 'ready') {
    return '已就绪'
  }

  if (status === 'adapter-shell') {
    return '壳层就绪'
  }

  if (status === 'not-configured') {
    return '未配置'
  }

  if (status === 'unavailable') {
    return '不可用'
  }

  return status
}

function formatProviderStatus(status: OkxProviderAdapterStatus['status']) {
  if (status === 'ready') {
    return '已就绪'
  }

  if (status === 'adapter-shell') {
    return '壳层就绪'
  }

  if (status === 'unavailable') {
    return '不可用'
  }

  return '未配置'
}

function getProviderTone(status: OkxProviderAdapterStatus['status']) {
  if (status === 'ready') {
    return 'success'
  }

  if (status === 'adapter-shell') {
    return 'gold'
  }

  return 'muted'
}

function formatCapabilityStatus(status: OkxIntegrationCapabilityStatus) {
  if (status === 'ready') {
    return '可用'
  }

  if (status === 'blocked') {
    return '已锁定'
  }

  if (status === 'unavailable') {
    return '不可用'
  }

  return '未配置'
}

function getCapabilityTone(status: OkxIntegrationCapabilityStatus) {
  if (status === 'ready') {
    return 'success'
  }

  if (status === 'blocked') {
    return 'danger'
  }

  return 'muted'
}

function formatDomainStatus(status: OkxIntegrationDomainStatus) {
  if (status === 'active') {
    return '当前主线'
  }

  return '独立未来域'
}

function getDomainTone(status: OkxIntegrationDomainStatus) {
  if (status === 'active') {
    return 'success'
  }

  return 'muted'
}

function createStyles(appTheme: AppTheme) {
  return StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      gap: theme.spacing.lg,
      padding: theme.spacing.xl,
      paddingTop: 72,
      paddingBottom: 48,
      backgroundColor: appTheme.colors.background,
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
    envItem: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.colors.borderMuted,
    },
    envCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    capabilityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: appTheme.colors.borderMuted,
      borderRadius: theme.radius.md,
      backgroundColor: appTheme.colors.surfaceElevated,
      padding: theme.spacing.md,
    },
    capabilityCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
  })
}
