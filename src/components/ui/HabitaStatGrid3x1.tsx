import React from 'react';
import { HabitaStatGrid, type HabitaMetricItem } from './HabitaStatGrid';

interface HabitaStatGrid3x1Props {
  title: string;
  icon?: React.ReactNode;
  metrics: [HabitaMetricItem, HabitaMetricItem, HabitaMetricItem];
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * HabitaStatGrid3x1 - Versão especializada que exibe 3 métricas empilhadas verticalmente (3x1).
 */
export const HabitaStatGrid3x1: React.FC<HabitaStatGrid3x1Props> = (props) => {
  return <HabitaStatGrid {...props} cols={1} cellClassName="p-2 md:p-5" />;
};
