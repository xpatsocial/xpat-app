import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import {
  nomadVisas,
  NomadVisa,
  getTaxFriendly,
  getEasiestApplications,
  getNewestPrograms,
} from '../lib/data/nomadVisas';
// AFFILIATE_PARTNERS removed pre-launch — re-add when agreements signed
import BrandHeader from '../components/BrandHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterKey = 'all' | 'tax-free' | 'affordable' | 'easy' | 'new';

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'globe' },
  { key: 'tax-free', label: 'Tax-Free', icon: 'dollar-sign' },
  { key: 'affordable', label: 'Affordable', icon: 'trending-down' },
  { key: 'easy', label: 'Easy Application', icon: 'check-circle' },
  { key: 'new', label: 'New 2025-2026', icon: 'zap' },
];

const AFFORDABLE_THRESHOLD = 2000; // monthly income under $2k

function getFilteredVisas(filter: FilterKey): Set<string> | null {
  switch (filter) {
    case 'tax-free':
      return new Set(getTaxFriendly().map((v) => v.country));
    case 'affordable':
      return new Set(
        nomadVisas
          .filter((v) => v.incomeMonthly <= AFFORDABLE_THRESHOLD || v.incomeMonthly === 0)
          .map((v) => v.country)
      );
    case 'easy':
      return new Set(getEasiestApplications().map((v) => v.country));
    case 'new':
      return new Set(getNewestPrograms().map((v) => v.country));
    default:
      return null;
  }
}

function AttractivenessBar({ score }: { score: number }) {
  const maxDots = 10;
  return (
    <View style={styles.attractivenessRow}>
      {Array.from({ length: maxDots }, (_, i) => (
        <View
          key={i}
          style={[
            styles.attractivenessDot,
            { backgroundColor: i < Math.round(score) ? colors.teal : colors.dark.bg3 },
          ]}
        />
      ))}
      <Text style={styles.attractivenessScore}>{score.toFixed(1)}</Text>
    </View>
  );
}

function VisaCard({ visa }: { visa: NomadVisa }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const isNew = visa.launchYear >= 2025;

  return (
    <TouchableOpacity
      style={styles.visaCard}
      onPress={toggle}
      activeOpacity={0.7}
    >
      <View style={styles.visaCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.countryRow}>
            <Text style={styles.countryName}>{visa.country}</Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.visaName}>{visa.visaName}</Text>
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.dark.text2}
        />
      </View>

      <View style={styles.visaStats}>
        <View style={styles.statItem}>
          <Feather name="clock" size={12} color={colors.teal} />
          <Text style={styles.statText}>{visa.duration}</Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="dollar-sign" size={12} color={colors.amber} />
          <Text style={styles.statText}>
            {visa.costUSD === 0 ? 'Free' : `$${visa.costUSD.toLocaleString()}`}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Feather name="bar-chart-2" size={12} color={colors.teal} />
          <Text style={styles.statText}>
            {visa.incomeMonthly === 0 ? 'No min' : `$${visa.incomeMonthly.toLocaleString()}/mo`}
          </Text>
        </View>
      </View>

      <AttractivenessBar score={visa.attractiveness} />

      {expanded && (
        <View style={styles.expandedSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Region</Text>
            <Text style={styles.detailValue}>{visa.region}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Renewable</Text>
            <Text style={styles.detailValue}>
              {visa.renewable === false ? 'No' : visa.renewable}
            </Text>
          </View>
          {visa.incomeAnnual > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Annual Income</Text>
              <Text style={styles.detailValue}>${visa.incomeAnnual.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ease of Application</Text>
            <View style={styles.easeRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <Feather
                  key={i}
                  name="star"
                  size={12}
                  color={i < visa.easeOfApp ? colors.amber : colors.dark.bg3}
                />
              ))}
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Popularity</Text>
            <View style={styles.easeRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <Feather
                  key={i}
                  name="users"
                  size={11}
                  color={i < visa.popularity ? colors.teal : colors.dark.bg3}
                />
              ))}
            </View>
          </View>

          <View style={styles.taxSection}>
            <Text style={styles.taxLabel}>Tax Implications</Text>
            <Text style={styles.taxText}>{visa.taxImplication}</Text>
          </View>

          {visa.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{visa.notes}</Text>
            </View>
          ) : null}

          <View style={styles.urlRow}>
            <Feather name="external-link" size={12} color={colors.teal} />
            <Text style={styles.urlText} numberOfLines={1}>
              {visa.applicationURL}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function NomadToolkitScreen() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filteredVisas = useMemo(() => {
    const filterSet = getFilteredVisas(activeFilter);
    let results = filterSet
      ? nomadVisas.filter((v) => filterSet.has(v.country))
      : [...nomadVisas];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (v) =>
          v.country.toLowerCase().includes(q) ||
          v.visaName.toLowerCase().includes(q) ||
          v.region.toLowerCase().includes(q)
      );
    }

    return results.sort((a, b) => b.attractiveness - a.attractiveness);
  }, [search, activeFilter]);

  // Affiliate partners removed pre-launch

  const renderVisaCard = useCallback(
    ({ item }: { item: NomadVisa }) => <VisaCard visa={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: NomadVisa) => `${item.country}-${item.visaName}`,
    []
  );

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color={colors.dark.text2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries, visas, regions..."
              placeholderTextColor={colors.dark.text2}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={16} color={colors.dark.text2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterPill,
                activeFilter === f.key && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Feather
                name={f.icon as any}
                size={12}
                color={activeFilter === f.key ? colors.dark.bg : colors.dark.text2}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === f.key && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Summary */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {filteredVisas.length} {filteredVisas.length === 1 ? 'country' : 'countries'}
          </Text>
          <Text style={styles.statsTextDim}>sorted by attractiveness</Text>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Feather name="compass" size={18} color={colors.teal} />
          <Text style={styles.sectionTitle}>Nomad Visa Explorer</Text>
        </View>
      </View>
    ),
    [search, activeFilter, filteredVisas.length]
  );

  const ListFooter = useMemo(
    () => (
      <View style={{ height: 100 }} />
    ),
    []
  );

  return (
    <View style={styles.container}>
      <BrandHeader />

      <FlatList
        data={filteredVisas}
        keyExtractor={keyExtractor}
        renderItem={renderVisaCard}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={40} color={colors.dark.text2} />
            <Text style={styles.emptyTitle}>No visas found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Search
  searchContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + spacing.xs : 0,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    paddingVertical: Platform.OS === 'android' ? spacing.sm : 0,
  },

  // Filters
  filtersScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  filterPillText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  filterPillTextActive: {
    color: colors.dark.bg,
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
  },
  statsTextDim: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },

  // Visa cards
  visaCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  visaCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  newBadge: {
    backgroundColor: colors.amber,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.dark.bg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visaName: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
    marginTop: 2,
  },

  // Stats row
  visaStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text,
  },

  // Attractiveness bar
  attractivenessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.sm,
  },
  attractivenessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  attractivenessScore: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.teal,
    marginLeft: spacing.xs,
  },

  // Expanded details
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  detailValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.dark.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  easeRow: {
    flexDirection: 'row',
    gap: 3,
  },
  taxSection: {
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  taxLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  taxText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text,
    lineHeight: 17,
  },
  notesSection: {
    marginBottom: spacing.sm,
  },
  notesLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text,
    lineHeight: 17,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  urlText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.teal,
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    marginTop: spacing.xs,
  },

  // Partner Tools section
  partnerSection: {
    marginTop: spacing.xl,
  },
  partnerIntro: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs,
    width: '100%',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  partnerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  partnerBadge: {
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  partnerBadgeText: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partnerName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.teal,
    marginTop: 1,
  },
  partnerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginTop: 1,
  },
  disclosureCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  disclosureText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    lineHeight: 17,
  },
  affiliateDisclosure: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
