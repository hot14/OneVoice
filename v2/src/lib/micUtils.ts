/**
 * Utility for handling microphone permission errors and providing user-friendly instructions.
 */

export interface MicErrorDetails {
  message: string;
  instructions: string[];
  isPermissionError: boolean;
}

/**
 * Analyzes a microphone error and returns detailed feedback.
 */
export function getMicErrorDetails(err: any): MicErrorDetails {
  const errorMessage = err.message || String(err);
  const isPermissionError = 
    err.name === 'NotAllowedError' || 
    err.name === 'PermissionDeniedError' ||
    errorMessage.toLowerCase().includes("permission denied");

  if (isPermissionError) {
    return {
      message: "마이크 권한이 거부되었습니다. (Microphone access denied.)",
      isPermissionError: true,
      instructions: [
        "브라우저 주소창 왼쪽의 자물쇠(🔒) 또는 설정 아이콘을 클릭하세요.",
        "마이크 항목을 찾아 '허용(Allow)'으로 변경하세요.",
        "페이지를 새로고침한 후 다시 시도하세요.",
        "만약 프리뷰 창에서 실행 중이라면, 우측 상단의 '새 탭에서 열기' 버튼을 눌러 독립된 창에서 실행해 보세요."
      ]
    };
  }

  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return {
      message: "연결된 마이크를 찾을 수 없습니다. (No microphone found.)",
      isPermissionError: false,
      instructions: [
        "마이크가 올바르게 연결되어 있는지 확인하세요.",
        "시스템 설정에서 마이크가 비활성화되어 있지 않은지 확인하세요.",
        "다른 앱에서 마이크를 사용 중이라면 종료 후 다시 시도하세요."
      ]
    };
  }

  return {
    message: "마이크를 시작하는 중 오류가 발생했습니다. (Error starting microphone.)",
    isPermissionError: false,
    instructions: [
      "브라우저를 재시작해 보세요.",
      "운영체제의 마이크 보안 설정에서 브라우저의 접근이 허용되어 있는지 확인하세요.",
      "오류가 지속되면 다른 브라우저(Chrome 권장)를 사용해 보세요."
    ]
  };
}
