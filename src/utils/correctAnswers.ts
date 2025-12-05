/**
 * 진단검사 정답표
 * TODO: 실제 정답으로 업데이트 필요
 */

import type { TestType } from '../types/diagnostic';

export type CorrectAnswers = { [questionNumber: number]: string };

/**
 * MONO 진단검사 정답표 (중1-1)
 */
export const MONO_CORRECT_ANSWERS: CorrectAnswers = {
  1: '5',
  2: '8',
  3: '16',
  4: '47/14',
  5: '110',
  6: '9',
  7: '0',
  8: '294',
  9: '8',
  10: '-32',
  11: '52',
  12: '3',
  13: '-5b+1',
  14: '1',
  15: '3/26',
  16: '-10/7',
  17: '-7',
  18: '-1',
  19: '0',
  20: '42',
  21: '-14',
  22: 'x>2',
  23: '1',
  24: '-2',
  25: '2/3',
};

/**
 * DI 진단검사 정답표 (중2-1)
 * TODO: 실제 정답으로 교체 필요
 */
export const DI_CORRECT_ANSWERS: CorrectAnswers = {
  1: '정답미입력',
  2: '정답미입력',
  3: '정답미입력',
  4: '정답미입력',
  5: '정답미입력',
  6: '정답미입력',
  7: '정답미입력',
  8: '정답미입력',
  9: '정답미입력',
  10: '정답미입력',
  11: '정답미입력',
  12: '정답미입력',
  13: '정답미입력',
  14: '정답미입력',
  15: '정답미입력',
  16: '정답미입력',
  17: '정답미입력',
  18: '정답미입력',
  19: '정답미입력',
  20: '정답미입력',
  21: '정답미입력',
  22: '정답미입력',
  23: '정답미입력',
  24: '정답미입력',
  25: '정답미입력',
};

/**
 * TRI 진단검사 정답표 (중3-1 + 공통수학1)
 * TODO: 실제 정답으로 교체 필요
 */
export const TRI_CORRECT_ANSWERS: CorrectAnswers = {
  1: '정답미입력',
  2: '정답미입력',
  3: '정답미입력',
  4: '정답미입력',
  5: '정답미입력',
  6: '정답미입력',
  7: '정답미입력',
  8: '정답미입력',
  9: '정답미입력',
  10: '정답미입력',
  11: '정답미입력',
  12: '정답미입력',
  13: '정답미입력',
  14: '정답미입력',
  15: '정답미입력',
  16: '정답미입력',
  17: '정답미입력',
  18: '정답미입력',
  19: '정답미입력',
  20: '정답미입력',
  21: '정답미입력',
  22: '정답미입력',
  23: '정답미입력',
  24: '정답미입력',
  25: '정답미입력',
};

/**
 * 시험 타입에 따른 정답표 가져오기
 */
export function getCorrectAnswers(testType: TestType): CorrectAnswers {
  switch (testType) {
    case 'MONO':
      return MONO_CORRECT_ANSWERS;
    case 'DI':
      return DI_CORRECT_ANSWERS;
    case 'TRI':
      return TRI_CORRECT_ANSWERS;
    default:
      throw new Error(`Unknown test type: ${testType}`);
  }
}
