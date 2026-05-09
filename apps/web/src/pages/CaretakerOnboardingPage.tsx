import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaretakerOnboardingStore } from '../store/caretakerOnboardingStore'
import { caretakerProfileService } from '../services/caretaker-profile.service'
import WizardHeader from '../components/onboarding/WizardHeader'
import StepIndicator from '../components/onboarding/StepIndicator'
import StepProgress from '../components/onboarding/StepProgress'
import Step1Personal from '../components/onboarding/Step1Personal'
import Step2Location from '../components/onboarding/Step2Location'
import Step3About from '../components/onboarding/Step1About'
import Step4Services from '../components/onboarding/Step3Services'
import Step5Preview from '../components/onboarding/Step4Preview'

const STEPS = ['Особисті дані', 'Локація', 'Про вас', 'Послуги', 'Перевірка'] as const

export default function CaretakerOnboardingPage() {
  const navigate = useNavigate()
  const currentStep = useCaretakerOnboardingStore((s) => s.currentStep)
  const maxVisitedStep = useCaretakerOnboardingStore((s) => s.maxVisitedStep)
  const formData = useCaretakerOnboardingStore((s) => s.formData)
  const goToStep = useCaretakerOnboardingStore((s) => s.goToStep)

  // Якщо профіль вже існує — wizard не потрібен, редіректимо на дашборд.
  // НЕ скидаємо стор тут — Step5 викликає reset() сам після успішного submit.
  useEffect(() => {
    caretakerProfileService.getMyCaretakerProfile().then((profile) => {
      if (profile !== null) {
        navigate('/settings/caretaker-profile', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-zinc-50">
      <WizardHeader />
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <StepIndicator
            currentStep={currentStep}
            steps={STEPS}
            maxVisitedStep={maxVisitedStep}
            onStepClick={(s) => goToStep(s as 1 | 2 | 3 | 4 | 5)}
          />
        </div>

        {currentStep < 5 && (
          <div className="mb-6">
            <StepProgress formData={formData} step={currentStep} />
          </div>
        )}

        {currentStep === 1 && <Step1Personal />}
        {currentStep === 2 && <Step2Location />}
        {currentStep === 3 && <Step3About />}
        {currentStep === 4 && <Step4Services />}
        {currentStep === 5 && <Step5Preview />}
      </div>
    </div>
  )
}
