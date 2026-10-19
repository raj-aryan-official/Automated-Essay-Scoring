import React from 'react';
import { ScoreCard, ScoreCardProps } from './ScoreCard';

export type HolisticScoreCardProps = ScoreCardProps;

// WHY: Seamless adapter re-exporting the comprehensive ScoreCard component to preserve all legacy imports and E2E test selectors.
export const HolisticScoreCard: React.FC<HolisticScoreCardProps> = (props) => {
  return <ScoreCard {...props} />;
};

export default HolisticScoreCard;
