import { createContext, useContext, useState, useEffect } from 'react';
import {
  getActiveDiagnosticTests,
  submitStudentAnswers,
  getAllResultsByPhone,
} from '../utils/diagnosticService';

const DiagnosticContext = createContext();

export function useDiagnostic() {
  const context = useContext(DiagnosticContext);
  if (!context) {
    throw new Error('useDiagnostic must be used within DiagnosticProvider');
  }
  return context;
}

export function DiagnosticProvider({ children }) {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // 학생 정보
  const [studentInfo, setStudentInfo] = useState({
    studentName: '',
    parentPhone: '',
    school: '',
    grade: '',
    mathLevel: '',
  });

  // 답안 (25개)
  const [answers, setAnswers] = useState(Array(25).fill(''));

  // 현재 단계 ('info' | 'test-select' | 'answer-input' | 'result')
  const [currentStep, setCurrentStep] = useState('info');

  // 제출 결과
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const testsData = await getActiveDiagnosticTests();
      setTests(testsData);
    } catch (error) {
      console.error('시험 목록 로드 실패:', error);
      showToast('시험 정보를 불러오는데 실패했습니다.', 'error');
    }
  };

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  const resetForm = () => {
    setStudentInfo({
      studentName: '',
      parentPhone: '',
      school: '',
      grade: '',
      mathLevel: '',
    });
    setAnswers(Array(25).fill(''));
    setSelectedTest(null);
    setCurrentStep('info');
    setSubmissionResult(null);
  };

  const submitAnswers = async () => {
    if (!selectedTest) {
      showToast('시험을 선택해주세요.', 'error');
      return;
    }

    // 답안 검증
    const emptyCount = answers.filter((a) => !a || a.trim() === '').length;
    if (emptyCount > 0) {
      showToast(`${emptyCount}개의 답안이 비어있습니다. 모두 입력해주세요.`, 'error');
      return;
    }

    setLoading(true);

    try {
      const request = {
        student_name: studentInfo.studentName,
        parent_phone: studentInfo.parentPhone,
        school: studentInfo.school,
        grade: studentInfo.grade,
        math_level: studentInfo.mathLevel,
        test_type: selectedTest.test_type,
        answers: answers,
      };

      const response = await submitStudentAnswers(request);

      if (response.success) {
        setSubmissionResult(response);
        setCurrentStep('result');
        showToast('채점이 완료되었습니다!', 'success');
      } else {
        showToast(response.error || '제출에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('답안 제출 실패:', error);
      showToast('답안 제출 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    tests,
    selectedTest,
    setSelectedTest,
    loading,
    setLoading,
    toast,
    showToast,
    hideToast,
    studentInfo,
    setStudentInfo,
    answers,
    setAnswers,
    currentStep,
    setCurrentStep,
    submissionResult,
    resetForm,
    submitAnswers,
  };

  return (
    <DiagnosticContext.Provider value={value}>
      {children}
    </DiagnosticContext.Provider>
  );
}
