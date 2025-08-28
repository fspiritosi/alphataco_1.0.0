'use client';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import React from 'react';

function FeatureFlagShow({ featureFlagName, children }: { featureFlagName: string; children: React.ReactNode }) {
  const flagEnabled = useFeatureFlagEnabled(featureFlagName);
  if (!flagEnabled) return null;
  return children;
}

export default FeatureFlagShow;
