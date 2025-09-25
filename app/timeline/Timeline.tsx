
'use client';

import React, { useEffect, useRef } from 'react';
import { Timeline as VisTimeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { DataSet } from 'vis-data/peer';

const sampleData = {
  'gpt-4o': [
    { id: 1, content: 'Released', start: '2024-05-13', type: 'release', details: { contextWindow: 128000, inputCost: 5, outputCost: 15 } },
    { id: 2, content: 'Mini version', start: '2024-07-01', type: 'update', details: { contextWindow: 128000, inputCost: 0.15, outputCost: 0.6 } },
    { id: 3, content: 'Pricing drop', start: '2025-02-01', type: 'pricing', details: { contextWindow: 128000, inputCost: 4.5, outputCost: 13.5 } },
  ]
};

export function Timeline({ model }: { model: string }) {
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      const items = new DataSet(sampleData[model] || []);
      const options = {};
      new VisTimeline(timelineRef.current, items, options);
    }
  }, [model]);

  return <div ref={timelineRef} />;
}
