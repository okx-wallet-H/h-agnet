import type { ComponentType } from 'react'
import { StyleSheet, View } from 'react-native'
import type { LucideProps } from 'lucide-react-native'

import { theme } from '../../design-system/theme'
import { AppText } from '../primitives/AppText'
import { TerminalCard } from './TerminalCard'

type ActionTileProps = {
  title: string
  caption: string
  icon: ComponentType<LucideProps>
}

export function ActionTile({ title, caption, icon: Icon }: ActionTileProps) {
  return (
    <TerminalCard style={styles.card}>
      <View style={styles.iconBox}>
        <Icon color={theme.colors.goldBright} size={20} />
      </View>
      <View style={styles.copy}>
        <AppText variant="data">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      </View>
    </TerminalCard>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 104,
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(216, 180, 95, 0.08)',
  },
  copy: {
    gap: theme.spacing.xs,
  },
})
