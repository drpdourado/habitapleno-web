import React from 'react';
import { HabitaStatGrid, type HabitaMetricItem } from './HabitaStatGrid';

interface HabitaStatGrid1x3Props {
  title: string;
  icon?: React.ReactNode;
  metrics: [HabitaMetricItem, HabitaMetricItem, HabitaMetricItem];
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * HabitaStatGrid1x3 - Versão especializada que exibe exatamente 3 métricas em uma linha (1x3).
 */
export const HabitaStatGrid1x3: React.FC<HabitaStatGrid1x3Props> = (props) => {
  return <HabitaStatGrid {...props} cols={3} cellClassName="p-2 md:p-5" />;
};
