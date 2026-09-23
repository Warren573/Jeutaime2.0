import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import { useFonts, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { paginateLines, type MeasuredLine } from '../../utils/paginateLetterText';

const SIGNATURE_BLOCK_HEIGHT = 64;
const PAGE_PADDING = 24;
const PAGE_INDICATOR_HEIGHT = 28;

interface LetterPaginatedViewProps {
  content: string;
  signatureName: string;
  dateLabel?: string;
}

export function LetterPaginatedView({ content, signatureName, dateLabel }: LetterPaginatedViewProps) {
  const [fontsLoaded] = useFonts({ Caveat_600SemiBold });
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number } | null>(null);
  const [measuredLines, setMeasuredLines] = useState<MeasuredLine[] | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewportSize(prev =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const onMeasureLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const next = e.nativeEvent.lines.map(line => ({ text: line.text, height: line.height }));
    setMeasuredLines(prev => {
      if (
        prev &&
        prev.length === next.length &&
        prev.every((line, index) => line.text === next[index].text && line.height === next[index].height)
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const pages = useMemo(() => {
    if (!measuredLines || !viewportSize) return null;
    const usableHeight = viewportSize.h - PAGE_PADDING * 2;
    return paginateLines(measuredLines, usableHeight, SIGNATURE_BLOCK_HEIGHT);
  }, [measuredLines, viewportSize]);

  const measureWidth = viewportSize ? Math.max(0, viewportSize.w - PAGE_PADDING * 2) : 0;

  useEffect(() => {
    setMeasuredLines(null);
    setPageIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [content, viewportSize?.w, viewportSize?.h]);

  return (
    <View style={styles.root}>
      <View style={styles.pageViewport} onLayout={onViewportLayout}>
        {viewportSize && measureWidth > 0 && (
          <Text
            key={`measure-${content}-${measureWidth}`}
            style={[styles.bodyText, styles.measureHidden, { width: measureWidth }]}
            onTextLayout={onMeasureLayout}
          >
            {content}
          </Text>
        )}

        {pages && viewportSize && (
          <ScrollView
            ref={scrollRef}
            style={styles.pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / viewportSize.w);
              setPageIndex(Math.max(0, Math.min(idx, pages.length - 1)));
            }}
          >
            {pages.map((pageLines, i) => (
              <View key={i} style={{ width: viewportSize.w, height: viewportSize.h }}>
                <View style={styles.pageInner}>
                  <View>
                    {i === 0 && dateLabel ? (
                      <View style={styles.letterMetaRow}>
                        <Text style={styles.letterMetaLabel}>LETTRE</Text>
                        <Text style={styles.letterMetaDate}>{dateLabel}</Text>
                      </View>
                    ) : null}

                    <View style={styles.bodyBlock}>
                      {pageLines.map((line, li) => (
                        <Text key={`${i}-${li}`} style={styles.bodyText}>
                          {line.length > 0 ? line : ' '}
                        </Text>
                      ))}
                    </View>
                  </View>

                  {i === pages.length - 1 && (
                    <View style={styles.signatureBlock}>
                      <Text style={[styles.signature, !fontsLoaded && styles.signatureFallback]}>
                        {signatureName}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {!pages && viewportSize && (
          <View style={[styles.pageInner, styles.fallbackPage]}>
            <View>
              {dateLabel ? (
                <View style={styles.letterMetaRow}>
                  <Text style={styles.letterMetaLabel}>LETTRE</Text>
                  <Text style={styles.letterMetaDate}>{dateLabel}</Text>
                </View>
              ) : null}

              <View style={styles.bodyBlock}>
                <Text style={styles.bodyText}>
                  {content}
                </Text>
              </View>
            </View>

            <View style={styles.signatureBlock}>
              <Text style={[styles.signature, !fontsLoaded && styles.signatureFallback]}>
                {signatureName}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.pageIndicatorArea}>
        {pages && pages.length > 1 ? (
          <View style={styles.pageIndicatorWrap}>
            <View style={styles.pageDots}>
              {pages.map((_, index) => (
                <View
                  key={index}
                  style={[styles.pageDot, index === pageIndex && styles.pageDotActive]}
                />
              ))}
            </View>
            <Text style={styles.pageIndicator}>
              Page {Math.min(pageIndex + 1, pages.length)} / {pages.length}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageViewport: { flex: 1, overflow: 'hidden' },
  pager: { flex: 1 },
  fallbackPage: {
    width: '100%',
    height: '100%',
  },
  measureHidden: {
    position: 'absolute',
    opacity: 0,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    top: 0,
    zIndex: -1,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 20,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  letterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9C7AA',
  },
  letterMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#9A7040',
  },
  letterMetaDate: {
    fontSize: 11,
    color: '#9A7040',
  },
  bodyBlock: {
    paddingHorizontal: 2,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 25,
    color: '#2C1A0E',
  },
  signatureBlock: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    minHeight: SIGNATURE_BLOCK_HEIGHT,
    justifyContent: 'flex-end',
  },
  signature: {
    fontFamily: 'Caveat_600SemiBold',
    fontSize: 36,
    color: '#5A3A1A',
    alignSelf: 'flex-end',
  },
  signatureFallback: {
    fontFamily: undefined,
    fontStyle: 'italic',
    fontWeight: '600',
    fontSize: 17,
  },
  pageIndicatorArea: {
    height: PAGE_INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8C7AE',
  },
  pageDotActive: {
    width: 12,
    backgroundColor: '#8B2E3C',
  },
  pageIndicator: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9A7040',
    letterSpacing: 0.2,
  },
});
