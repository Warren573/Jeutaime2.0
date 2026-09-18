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
}

export function LetterPaginatedView({ content, signatureName }: LetterPaginatedViewProps) {
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
    setPageIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [content, viewportSize?.w, viewportSize?.h]);

  return (
    <View style={styles.root}>
      <View style={styles.pageViewport} onLayout={onViewportLayout}>
        {viewportSize && measureWidth > 0 && (
          <Text
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
                    {pageLines.map((line, li) => (
                      <Text key={`${i}-${li}`} style={styles.bodyText}>
                        {line.length > 0 ? line : ' '}
                      </Text>
                    ))}
                  </View>
                  {i === pages.length - 1 && (
                    <Text style={[styles.signature, !fontsLoaded && styles.signatureFallback]}>
                      {signatureName}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.pageIndicatorArea}>
        {pages && pages.length > 1 ? (
          <Text style={styles.pageIndicator}>
            {Math.min(pageIndex + 1, pages.length)} / {pages.length}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageViewport: { flex: 1, overflow: 'hidden' },
  pager: { flex: 1 },
  measureHidden: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
    top: 0,
  },
  pageInner: {
    flex: 1,
    padding: PAGE_PADDING,
    justifyContent: 'space-between',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2C1A0E',
  },
  signature: {
    fontFamily: 'Caveat_600SemiBold',
    fontSize: 34,
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
  pageIndicator: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9A7040',
    letterSpacing: 0.5,
  },
});
