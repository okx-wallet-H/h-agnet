import { StyleSheet, View } from 'react-native'

import { theme } from '../../design-system/theme'
import { AppText } from '../primitives/AppText'
import { StatusPill } from '../primitives/StatusPill'

type ScreenHeaderProps = {
  eyebrow: string
  title: string
  description: string
  statusLabel?: string
  statusTone?: 'gold' | 'purple' | 'success' | 'muted' | 'danger'
}

export function ScreenHeader({
  eyebrow,
  title,
  description,
  statusLabel,
  statusTone = 'muted',
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.titleGroup}>
          <AppText variant="caption" color="goldBright">
            {eyebrow}
          </AppText>
          <AppText variant="display">{title}</AppText>
        </View>
        {statusLabel ? (
          <StatusPill label={statusLabel} tone={statusTone} />
        ) : null}
      </View>
      <AppText color="textSecondary">{description}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: theme.spacing.xs,
  },
})
