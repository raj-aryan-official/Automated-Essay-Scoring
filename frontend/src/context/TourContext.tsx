import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  bulletPoints: string[];
  routeTarget: string;
  routeLabel: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'submit',
    stepNumber: 1,
    totalSteps: 4,
    title: 'Submit & Upload Essays',
    subtitle: 'Step 1 of 4: Ingestion & In-Memory Preprocessing',
    badge: 'Submit',
    description:
      'Begin the evaluation workflow by submitting student prose. You can paste essay text directly or upload PDF, DOCX, or TXT documents. For instant zero-typing evaluation, use our 1-click "Try Sample Essay" preset.',
    bulletPoints: [
      'Choose from 8 standardized ASAP benchmark rubric sets (Persuasive, Expository, Narrative)',
      'Real-time live word and character counters with boundary guidance',
      'Instant 1-click sample essay loader for quick calibration testing',
    ],
    routeTarget: '/submit',
    routeLabel: 'Open Submission Page',
  },
  {
    id: 'score',
    stepNumber: 2,
    totalSteps: 4,
    title: 'Automated AI Scoring',
    subtitle: 'Step 2 of 4: BERT Neural Evaluation',
    badge: 'Score',
    description:
      'Our fine-tuned BERT transformer neural model analyzes student writing in under 3 seconds. The model outputs a continuous holistic score calibrated to the rubric range, accompanied by an explicit certainty metric.',
    bulletPoints: [
      'Continuous regression head outputs calibrated scores with denominator scale',
      'Certainty Metric reflects statistical distance from training distributions',
      'Asynchronous worker telemetry tracking queue status, latency, and throughput',
    ],
    routeTarget: '/jobs',
    routeLabel: 'View Scoring Jobs',
  },
  {
    id: 'feedback',
    stepNumber: 3,
    totalSteps: 4,
    title: 'Read Diagnostic Feedback',
    subtitle: 'Step 3 of 4: Multi-Trait Rubrics & Annotations',
    badge: 'Read Feedback',
    description:
      'Move beyond monolithic letter grades. Inspect granular sub-scores across Grammar & Mechanics, Coherence & Organization, and Argumentation & Evidence, visualized via an interactive 3-axis radar chart and sentence-level highlights.',
    bulletPoints: [
      'Itemized pedagogical growth areas sorted by severity (High Priority → Proficient)',
      'Interactive radar chart comparing multidimensional writing strengths',
      'Clicking diagnostic points highlights corresponding sentences directly in the text',
    ],
    routeTarget: '/essays',
    routeLabel: 'Explore Scored Essays',
  },
  {
    id: 'override',
    stepNumber: 4,
    totalSteps: 4,
    title: 'Teacher Reviewer Override',
    subtitle: 'Step 4 of 4: Human-in-the-Loop Authority',
    badge: 'Override',
    description:
      'Educators retain ultimate pedagogical authority. If an essay is flagged for low confidence or demonstrates creative nuance uncaptured by BERT, teachers can adjust the holistic score, select a reason code, and record a permanent audit entry.',
    bulletPoints: [
      'Precise slider adjustment along the verified prompt rubric scale',
      'Mandatory pedagogical rationale capture for administrative accountability',
      'Instant recalculation of rubric performance band with permanent audit logging',
    ],
    routeTarget: '/essays',
    routeLabel: 'Try Reviewer Override',
  },
];

interface TourContextType {
  isOpen: boolean;
  currentStep: number;
  openTour: (step?: number) => void;
  closeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstRun: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

const STORAGE_KEY = 'aes_teacher_tour_dismissed_v1';

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);

  // Check if first-time TEACHER user on mount or authentication change
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === 'TEACHER') {
      const alreadyDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
      const isAutomatedTest = typeof navigator !== 'undefined' && Boolean(navigator.webdriver);
      if (!alreadyDismissed && !isAutomatedTest) {
        setIsFirstRun(true);
        // Small delay to allow initial page layout to mount before tour modal appears
        const timer = setTimeout(() => {
          setIsOpen(true);
          setCurrentStep(0);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user]);

  const openTour = useCallback((step: number = 0) => {
    setCurrentStep(Math.max(0, Math.min(step, TOUR_STEPS.length - 1)));
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsFirstRun(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= TOUR_STEPS.length - 1) {
        closeTour();
        return prev;
      }
      return prev + 1;
    });
  }, [closeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, TOUR_STEPS.length - 1)));
  }, []);

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStep,
        openTour,
        closeTour,
        nextStep,
        prevStep,
        goToStep,
        isFirstRun,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
