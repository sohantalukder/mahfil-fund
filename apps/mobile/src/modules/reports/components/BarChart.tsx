import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';

const LOGO_BG = '#1A5C30';
const GOLD = '#E8A800';

interface BarChartProps {
  data: { label: string; value: number }[];
  highlightIndex?: number;
  height?: number;
  barColor?: string;
  highlightColor?: string;
  textColor?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  highlightIndex,
  height = 170,
  barColor,
  highlightColor = GOLD,
  textColor = '#767779',
}) => {
  const svgWidth = 300;
  const labelHeight = 24;
  const chartHeight = height - labelHeight;
  const count = data.length;
  const barWidth = Math.floor((svgWidth * 0.55) / count);
  const totalBarSpace = count * barWidth;
  const totalGapSpace = svgWidth - totalBarSpace;
  const gap = Math.floor(totalGapSpace / (count + 1));
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const computedHighlight =
    highlightIndex !== undefined
      ? highlightIndex
      : data.reduce(
          (best, item, i) => (item.value > data[best]!.value ? i : best),
          0,
        );

  return (
    <View style={{ width: '100%', height }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <G>
          {data.map((item, index) => {
            const minBarHeight = 8;
            const availableHeight = chartHeight - 4;
            const barHeight =
              item.value > 0
                ? Math.max(
                    minBarHeight,
                    (item.value / maxValue) * availableHeight,
                  )
                : minBarHeight;
            const x = gap + index * (barWidth + gap);
            const y = chartHeight - barHeight;
            const isHighlighted = index === computedHighlight;
            const fill = isHighlighted
              ? highlightColor
              : (barColor ?? LOGO_BG);
            const rx = 5;

            return (
              <G key={item.label}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={fill}
                  rx={rx}
                  ry={rx}
                  opacity={isHighlighted ? 1 : 0.65}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={height - 6}
                  fill={textColor}
                  fontSize={10}
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};
