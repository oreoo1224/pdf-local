export const locales = ['en', 'ko', 'es', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const tools = ['word-to-pdf', 'ppt-to-pdf', 'merge-pdf', 'jpg-to-pdf', 'pdf-to-jpg', 'organize-pdf'] as const;
export type Tool = (typeof tools)[number];
export type LegalSlug = 'about' | 'privacy' | 'terms' | 'contact';

export interface ToolLabel { name: string; short: string; accept: string }
export interface ToolContent {
  title: string;
  description: string;
  heading: string;
  intro: string;
  steps: string[];
  features: string[];
  faqs: { q: string; a: string }[];
}
export interface LegalContent { title: string; description: string; paragraphs: string[] }

const en = {
  navTools: 'PDF tools', language: 'Language', freeBadge: 'FREE · NO SIGN-UP',
  heroTitle: 'Simple PDF tools. Files stay with you.',
  heroSubtitle: 'Choose a tool, add your files, and download your result.',
  choosePdf: 'Choose PDF files', chooseImages: 'Choose images',
  dropPdf: 'Drop your PDF files here', dropImages: 'Drop your images here',
  mergeHint: 'Select two or more PDF files to merge', singleHint: 'Choose one PDF to get started',
  imageHint: 'Add JPG, JPEG or PNG images',
  privacyHint: 'Processed in your browser. Never uploaded.',
  trustLocal: 'No server uploads', trustDevice: 'Works on your device', trustDownload: 'Save directly to your computer',
  downloadPendingHelp: 'Convert a file above to enable download.',
  addFiles: 'Add files', clearAll: 'Clear all', remove: 'Remove', moveUp: 'Move up', moveDown: 'Move down',
  pages: 'pages', page: 'Page', files: 'files', processing: 'Processing…', download: 'Download result',
  startOver: 'Start a new task', editAgain: 'Edit again',
  mergeAction: 'Merge PDFs', organizeAction: 'Save edited PDF', imageAction: 'Create PDF', pdfImageAction: 'Convert to images',
  loadingPreview: 'Preparing page previews…', selectAll: 'Select all', deselectAll: 'Deselect all',
  rotateBy: 'Rotate by', restore: 'Restore page', saveChanges: 'Save changes', previewLabel: 'Page preview', skipToContent: 'Skip to content', outputName: 'Output file name',
  zipPages: 'Download pages as ZIP',
  deleteSelected: 'Delete selected', rotateSelected: 'Rotate selected', rotateAll: 'Rotate all', extractSelected: 'Extract selected pages',
  rangeLabel: 'Pages to include', rangeHelp: 'For example: 1-3, 5, 8-10. Leave blank to include all pages.', rangeApply: 'Apply range',
  outputFormat: 'Output format', resolution: 'Resolution', quality: 'JPG quality', paper: 'Paper size',
  orientation: 'Orientation', margin: 'Margin', fit: 'Image fit', a4: 'A4', letter: 'US Letter', original: 'Original image size',
  auto: 'Automatic', portrait: 'Portrait', landscape: 'Landscape', contain: 'Fit entire image', cover: 'Fill page (crop edges)',
  normal: 'Standard', high: 'High', veryHigh: 'Very high', selected: 'selected', deleted: 'Deleted',
  preserveNotice: 'Editing may invalidate digital signatures. Interactive forms, bookmarks and other document features may not be preserved.',
  about: 'About', privacy: 'Privacy', terms: 'Terms', contact: 'Contact', relatedTools: 'Related tools',
  howTo: 'How to use this tool', features: 'What you can do', faq: 'Frequently asked questions',
  footerNote: 'Free PDF tools. Your files stay on your device.', workingTitle: 'PDFEditGo',
  adNotice: 'Advertising', contactNote: 'A public support address has not been configured. See the contact page for the current status.',
  "chooseWord": "Choose Word / Hangul file",
  "choosePpt": "Choose PowerPoint file",
  "dropWord": "Drop your Word or Hangul document here",
  "dropPpt": "Drop your PowerPoint file here",
  "officeWordHint": "Choose one DOCX, HWP 5.0 or HWPX document, up to 20 MB",
  "officePptHint": "Choose one .pptx presentation, up to 20 MB",
  "officeNotice": "The PDF contains page images, so its text cannot be selected or searched. Fonts and complex layouts may differ from the original. Supported inputs are DOCX, HWP 5.0, HWPX and PPTX. Older DOC/PPT and protected Hangul files are not supported.",
  "officeAction": "Convert to PDF",
  "officeLoading": "Preparing your document…",
  tools: {
    'merge-pdf': { name: 'Merge PDF', short: 'Combine multiple PDFs', accept: 'application/pdf,.pdf' },
    'organize-pdf': { name: 'Organize PDF', short: 'Split, rotate & delete', accept: 'application/pdf,.pdf' },
    'pdf-to-jpg': { name: 'PDF to Image', short: 'Export JPG or PNG', accept: 'application/pdf,.pdf' },
    'jpg-to-pdf': { name: 'Image to PDF', short: 'Turn images into a PDF', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png' },
    "word-to-pdf": {"name": "Word / Hangul to PDF", "short": "DOCX · HWP · HWPX", "accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/hwp+zip,.docx,.hwp,.hwpx"},
    "ppt-to-pdf": {"name": "PPT to PDF", "short": "Convert PPTX slides", "accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"},
  },
  errors: {
    "officeUnsupported": "Choose DOCX, HWP 5.0 or HWPX for Word / Hangul, or PPTX for PowerPoint. Older DOC/PPT/HWP formats, password-protected or DRM-protected files and macro-enabled documents are not supported.",
    "officeCorrupt": "This document could not be read. It may be damaged or use an unsupported structure.",
    "officeTooLarge": "Choose a document of 20 MB or less. Highly compressed or unusually large document contents are not supported.",
    "officeRender": "A page could not be converted. Try a simpler document and check its fonts, images and layout.",
    "officeBrowser": "Your browser does not support document rendering. Try a current version of Chrome, Edge, Firefox or Safari.",
    "officeLimit": "Conversion supports up to 50 output pages or slides per task. Choose a smaller range or lower resolution.",
    "officeExternal": "Externally linked resources are not loaded. Use a document with its pictures and other resources embedded.",
    tooManyFiles: 'Please process no more than 30 files in one task.', totalSize: 'The selected files exceed 100 MB. Try a smaller batch.',
    fileSize: 'A selected file exceeds 50 MB. Please choose a smaller file.', invalidPdf: 'This PDF could not be read. It may be damaged or unsupported.',
    invalidImage: 'This image could not be read. Please use a valid JPG or PNG file.', encrypted: 'Password-protected or encrypted PDFs are not supported. Use an unencrypted copy.',
    invalidRange: 'Enter valid page numbers or ranges, such as 1-3, 5. Check that the pages exist.', emptyPages: 'Keep at least one page in the PDF.',
    memoryLimit: 'This task is too large for safe processing. Use fewer pages, smaller images or a lower resolution.',
    needTwo: 'Add at least two PDF files to merge.', needOne: 'Choose one file to continue.',
    tooManyPages: 'The page editor supports up to 200 pages per document. Please choose a smaller PDF.', invalidSelection: 'Select at least one available page to continue.',
    unknown: 'The task could not be completed. Try a smaller file or start again.',
    unsupportedBrowser: 'Your browser does not support a required feature. Please try a current version of Chrome, Edge, Firefox or Safari.',
  },
};

export type Dictionary = { [K in Exclude<keyof typeof en, 'tools' | 'errors'>]: string } & {
  tools: Record<Tool, ToolLabel>;
  errors: { [K in keyof typeof en.errors]: string };
};

const ko: Dictionary = {
  navTools: 'PDF 도구', language: '언어', freeBadge: '무료 · 회원가입 없음',
  heroTitle: '간편한 PDF 작업. 파일은 내 기기에.', heroSubtitle: '도구를 선택하고 파일을 추가한 뒤 결과를 내려받으세요.',
  choosePdf: 'PDF 파일 선택', chooseImages: '이미지 선택', dropPdf: 'PDF 파일을 여기에 놓으세요', dropImages: '이미지를 여기에 놓으세요',
  mergeHint: '합칠 PDF 파일을 두 개 이상 선택하세요', singleHint: '작업할 PDF 파일 하나를 선택하세요', imageHint: 'JPG, JPEG 또는 PNG 이미지를 추가하세요',
  privacyHint: '브라우저에서 처리하며 파일을 업로드하지 않습니다.', trustLocal: '서버 업로드 없음', trustDevice: '내 기기에서 처리', trustDownload: '내 PC로 바로 저장',
  downloadPendingHelp: '위에서 파일을 변환하면 다운로드할 수 있습니다.',
  addFiles: '파일 추가', clearAll: '전체 비우기', remove: '제거', moveUp: '위로 이동', moveDown: '아래로 이동',
  pages: '페이지', page: '페이지', files: '개 파일', processing: '처리 중…', download: '결과 다운로드', startOver: '새 작업 시작', editAgain: '다시 편집',
  mergeAction: 'PDF 합치기', organizeAction: '편집한 PDF 저장', imageAction: 'PDF 만들기', pdfImageAction: '이미지로 변환',
  loadingPreview: '페이지 미리보기를 준비하고 있습니다…', selectAll: '전체 선택', deselectAll: '선택 해제', deleteSelected: '선택한 페이지 삭제',
  rotateBy: '회전 각도', restore: '페이지 복원', saveChanges: '변경 사항 저장', previewLabel: '페이지 미리보기', skipToContent: '본문으로 건너뛰기', outputName: '결과 파일명',
  zipPages: '페이지별 PDF를 ZIP으로 다운로드',
  rotateSelected: '선택한 페이지 회전', rotateAll: '전체 회전', extractSelected: '선택한 페이지 추출',
  rangeLabel: '포함할 페이지', rangeHelp: '예: 1-3, 5, 8-10. 비워 두면 모든 페이지를 포함합니다.', rangeApply: '범위 적용',
  outputFormat: '출력 형식', resolution: '해상도', quality: 'JPG 품질', paper: '용지 크기', orientation: '방향', margin: '여백', fit: '이미지 맞춤',
  a4: 'A4', letter: 'Letter', original: '원본 이미지 크기', auto: '자동', portrait: '세로', landscape: '가로', contain: '이미지 전체 맞추기', cover: '용지 채우기 (가장자리 잘림)',
  normal: '표준', high: '높음', veryHigh: '매우 높음', selected: '개 선택', deleted: '삭제됨',
  preserveNotice: 'PDF를 편집하면 기존 전자서명의 효력이 사라질 수 있습니다. 입력 양식, 북마크 등 부가 기능은 보존되지 않을 수 있습니다.',
  about: '서비스 소개', privacy: '개인정보 안내', terms: '이용약관', contact: '문의', relatedTools: '관련 도구', howTo: '사용 방법', features: '주요 기능', faq: '자주 묻는 질문',
  footerNote: '무료 PDF 도구. 파일은 내 기기에 머뭅니다.', workingTitle: 'PDFEditGo', adNotice: '광고',
  contactNote: '공개 문의 주소가 아직 설정되지 않았습니다. 현재 상태는 문의 페이지에서 확인할 수 있습니다.',
  "chooseWord": "워드/한글 파일 선택",
  "choosePpt": "파워포인트 파일 선택",
  "dropWord": "워드 또는 한글 문서를 여기에 놓으세요",
  "dropPpt": "파워포인트 파일을 여기에 놓으세요",
  "officeWordHint": "20MB 이하의 DOCX·HWP 5.0·HWPX 문서 하나를 선택하세요",
  "officePptHint": "20MB 이하의 .pptx 프레젠테이션 하나를 선택하세요",
  "officeNotice": "PDF에 페이지를 이미지로 담으므로 글자를 선택하거나 검색할 수 없습니다. 글꼴과 복잡한 배치는 원본과 다를 수 있습니다. DOCX·HWP 5.0·HWPX·PPTX를 지원하며, 이전 DOC·PPT 형식과 보호된 한글 파일은 지원하지 않습니다.",
  "officeAction": "PDF로 변환",
  "officeLoading": "문서를 준비하고 있습니다…",
  tools: {
    'merge-pdf': { name: 'PDF 합치기', short: '여러 PDF를 하나로', accept: 'application/pdf,.pdf' },
    'organize-pdf': { name: '페이지 편집', short: '나누기 · 회전 · 삭제', accept: 'application/pdf,.pdf' },
    'pdf-to-jpg': { name: 'PDF → 이미지', short: 'JPG 또는 PNG로 저장', accept: 'application/pdf,.pdf' },
    'jpg-to-pdf': { name: '이미지 → PDF', short: '이미지를 PDF로 변환', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png' },
    "word-to-pdf": {"name": "워드/한글 → PDF", "short": "DOCX · HWP · HWPX", "accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/hwp+zip,.docx,.hwp,.hwpx"},
    "ppt-to-pdf": {"name": "PPT → PDF", "short": "PPTX 슬라이드 변환", "accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"},
  },
  errors: {
    "officeUnsupported": "워드/한글은 DOCX·HWP 5.0·HWPX, 파워포인트는 PPTX를 선택해 주세요. 이전 DOC·PPT·HWP 형식, 암호·DRM 보호 파일, 매크로 포함 문서는 지원하지 않습니다.",
    "officeCorrupt": "문서를 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 구조일 수 있습니다.",
    "officeTooLarge": "20MB 이하의 문서를 선택해 주세요. 압축 해제한 내용이 지나치게 큰 문서도 지원하지 않습니다.",
    "officeRender": "페이지를 변환하지 못했습니다. 더 단순한 문서로 시도하고 글꼴·이미지·배치를 확인해 주세요.",
    "officeBrowser": "브라우저가 문서 렌더링에 필요한 기능을 지원하지 않습니다. 최신 Chrome, Edge, Firefox 또는 Safari를 사용해 주세요.",
    "officeLimit": "한 작업에서 최대 50페이지 또는 슬라이드를 출력할 수 있습니다. 범위를 줄이거나 해상도를 낮춰 주세요.",
    "officeExternal": "외부 주소의 자료는 불러오지 않습니다. 사진 등 자료가 문서 안에 포함된 파일을 사용해 주세요.",
    tooManyFiles: '한 번에 처리할 파일을 30개 이하로 줄여 주세요.', totalSize: '선택한 파일의 총용량이 100MB를 넘습니다. 파일을 나누어 처리해 주세요.',
    fileSize: '50MB가 넘는 파일이 있습니다. 더 작은 파일을 선택해 주세요.', invalidPdf: 'PDF를 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다.',
    invalidImage: '이미지를 읽을 수 없습니다. 올바른 JPG 또는 PNG 파일을 선택해 주세요.', encrypted: '암호로 보호되거나 암호화된 PDF는 지원하지 않습니다. 암호화되지 않은 사본을 사용해 주세요.',
    invalidRange: '1-3, 5처럼 올바른 페이지 번호나 범위를 입력하고, 해당 페이지가 있는지 확인해 주세요.', emptyPages: 'PDF에는 최소 한 페이지를 남겨야 합니다.',
    memoryLimit: '안정적으로 처리하기에 작업 크기가 너무 큽니다. 페이지 수, 이미지 크기 또는 해상도를 줄여 주세요.',
    needTwo: '합칠 PDF 파일을 두 개 이상 추가해 주세요.', needOne: '계속하려면 파일 하나를 선택해 주세요.', unknown: '작업을 완료하지 못했습니다. 더 작은 파일로 시도하거나 새로 시작해 주세요.',
    tooManyPages: '페이지 편집은 문서당 최대 200페이지를 지원합니다. 더 작은 PDF를 선택해 주세요.', invalidSelection: '계속하려면 사용할 페이지를 하나 이상 선택해 주세요.',
    unsupportedBrowser: '브라우저가 필요한 기능을 지원하지 않습니다. 최신 Chrome, Edge, Firefox 또는 Safari를 사용해 주세요.',
  },
};

const es: Dictionary = {
  navTools: 'Herramientas PDF', language: 'Idioma', freeBadge: 'GRATIS · SIN REGISTRO',
  heroTitle: 'PDF sin complicaciones. Tus archivos, contigo.', heroSubtitle: 'Elige una herramienta, añade tus archivos y descarga el resultado.',
  choosePdf: 'Elegir archivos PDF', chooseImages: 'Elegir imágenes', dropPdf: 'Arrastra tus archivos PDF aquí', dropImages: 'Arrastra tus imágenes aquí',
  mergeHint: 'Selecciona dos o más archivos PDF para unirlos', singleHint: 'Elige un PDF para empezar', imageHint: 'Añade imágenes JPG, JPEG o PNG',
  privacyHint: 'Procesado en tu navegador. Los archivos no se suben.', trustLocal: 'Sin subir archivos', trustDevice: 'Se procesa en tu dispositivo', trustDownload: 'Guarda el resultado en tu equipo',
  downloadPendingHelp: 'Convierte un archivo arriba para activar la descarga.',
  addFiles: 'Añadir archivos', clearAll: 'Vaciar todo', remove: 'Quitar', moveUp: 'Subir', moveDown: 'Bajar', pages: 'páginas', page: 'Página', files: 'archivos',
  processing: 'Procesando…', download: 'Descargar resultado', startOver: 'Iniciar otra tarea', editAgain: 'Volver a editar',
  mergeAction: 'Unir PDF', organizeAction: 'Guardar PDF editado', imageAction: 'Crear PDF', pdfImageAction: 'Convertir a imágenes',
  loadingPreview: 'Preparando vistas previas…', selectAll: 'Seleccionar todo', deselectAll: 'Quitar selección', deleteSelected: 'Eliminar selección',
  rotateBy: 'Ángulo de giro', restore: 'Restaurar página', saveChanges: 'Guardar cambios', previewLabel: 'Vista previa de página', skipToContent: 'Ir al contenido', outputName: 'Nombre del archivo de salida',
  zipPages: 'Descargar páginas en ZIP',
  rotateSelected: 'Girar selección', rotateAll: 'Girar todo', extractSelected: 'Extraer páginas seleccionadas',
  rangeLabel: 'Páginas que incluir', rangeHelp: 'Ejemplo: 1-3, 5, 8-10. Déjalo vacío para incluir todas las páginas.', rangeApply: 'Aplicar intervalo',
  outputFormat: 'Formato de salida', resolution: 'Resolución', quality: 'Calidad JPG', paper: 'Tamaño de papel', orientation: 'Orientación', margin: 'Margen', fit: 'Ajuste de imagen',
  a4: 'A4', letter: 'Carta', original: 'Tamaño original de la imagen', auto: 'Automática', portrait: 'Vertical', landscape: 'Horizontal',
  contain: 'Mostrar la imagen completa', cover: 'Llenar la página (recorta bordes)', normal: 'Estándar', high: 'Alta', veryHigh: 'Muy alta', selected: 'seleccionadas', deleted: 'Eliminada',
  preserveNotice: 'Editar un PDF puede invalidar sus firmas digitales. Es posible que no se conserven formularios interactivos, marcadores u otras funciones del documento.',
  about: 'Acerca de', privacy: 'Privacidad', terms: 'Condiciones', contact: 'Contacto', relatedTools: 'Herramientas relacionadas', howTo: 'Cómo utilizar esta herramienta', features: 'Qué puedes hacer', faq: 'Preguntas frecuentes',
  footerNote: 'Herramientas PDF gratuitas. Tus archivos permanecen en tu dispositivo.', workingTitle: 'PDFEditGo', adNotice: 'Publicidad',
  contactNote: 'Todavía no se ha configurado una dirección pública de soporte. Consulta su estado en la página de contacto.',
  "chooseWord": "Elegir archivo Word / Hangul",
  "choosePpt": "Elegir archivo PowerPoint",
  "dropWord": "Arrastra tu documento Word o Hangul aquí",
  "dropPpt": "Arrastra tu archivo PowerPoint aquí",
  "officeWordHint": "Elige un DOCX, HWP 5.0 o HWPX de hasta 20 MB",
  "officePptHint": "Elige una presentación .pptx de hasta 20 MB",
  "officeNotice": "El PDF contiene imágenes de las páginas y no permite seleccionar ni buscar texto. Las fuentes y los diseños complejos pueden variar. Se admiten DOCX, HWP 5.0, HWPX y PPTX; no se admiten DOC/PPT antiguos ni archivos Hangul protegidos.",
  "officeAction": "Convertir a PDF",
  "officeLoading": "Preparando el documento…",
  tools: {
    'merge-pdf': { name: 'Unir PDF', short: 'Combina varios PDF', accept: 'application/pdf,.pdf' },
    'organize-pdf': { name: 'Organizar PDF', short: 'Divide, gira y elimina', accept: 'application/pdf,.pdf' },
    'pdf-to-jpg': { name: 'PDF a imagen', short: 'Exporta a JPG o PNG', accept: 'application/pdf,.pdf' },
    'jpg-to-pdf': { name: 'Imagen a PDF', short: 'Convierte imágenes a PDF', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png' },
    "word-to-pdf": {"name": "Word / Hangul a PDF", "short": "DOCX · HWP · HWPX", "accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/hwp+zip,.docx,.hwp,.hwpx"},
    "ppt-to-pdf": {"name": "PPT a PDF", "short": "Convierte diapositivas PPTX", "accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"},
  },
  errors: {
    "officeUnsupported": "Elige DOCX, HWP 5.0 o HWPX para Word / Hangul, o PPTX para PowerPoint. No se admiten formatos DOC/PPT/HWP antiguos, archivos con contraseña o DRM ni documentos con macros.",
    "officeCorrupt": "No se ha podido leer el documento. Puede estar dañado o utilizar una estructura no compatible.",
    "officeTooLarge": "Elige un documento de hasta 20 MB. No se admiten contenidos descomprimidos excesivamente grandes.",
    "officeRender": "No se ha podido convertir una página. Prueba un documento más sencillo y revisa sus fuentes, imágenes y diseño.",
    "officeBrowser": "Tu navegador no permite representar el documento. Prueba una versión actual de Chrome, Edge, Firefox o Safari.",
    "officeLimit": "Se pueden generar hasta 50 páginas o diapositivas por tarea. Reduce el intervalo o la resolución.",
    "officeExternal": "No se cargan recursos externos enlazados. Utiliza un documento con sus imágenes y demás recursos incorporados.",
    tooManyFiles: 'Procesa como máximo 30 archivos por tarea.', totalSize: 'Los archivos seleccionados superan los 100 MB. Prueba con un grupo más pequeño.',
    fileSize: 'Un archivo seleccionado supera los 50 MB. Elige uno más pequeño.', invalidPdf: 'No se ha podido leer este PDF. Puede estar dañado o utilizar un formato no compatible.',
    invalidImage: 'No se ha podido leer esta imagen. Usa un archivo JPG o PNG válido.', encrypted: 'Los PDF cifrados o protegidos con contraseña no son compatibles. Utiliza una copia sin cifrar.',
    invalidRange: 'Introduce páginas o intervalos válidos, como 1-3, 5, y comprueba que existan.', emptyPages: 'El PDF debe conservar al menos una página.',
    memoryLimit: 'La tarea es demasiado grande para procesarla con seguridad. Reduce las páginas, el tamaño de las imágenes o la resolución.',
    needTwo: 'Añade al menos dos archivos PDF para unirlos.', needOne: 'Elige un archivo para continuar.', unknown: 'No se ha podido completar la tarea. Prueba con un archivo más pequeño o empieza de nuevo.',
    tooManyPages: 'El editor admite hasta 200 páginas por documento. Elige un PDF más pequeño.', invalidSelection: 'Selecciona al menos una página disponible para continuar.',
    unsupportedBrowser: 'Tu navegador no admite una función necesaria. Utiliza una versión actual de Chrome, Edge, Firefox o Safari.',
  },
};

const ja: Dictionary = {
  navTools: 'PDFツール', language: '言語', freeBadge: '無料・登録不要',
  heroTitle: 'PDFの作業を手軽に。ファイルはお手元に。', heroSubtitle: 'ツールを選び、ファイルを追加して、結果をダウンロード。',
  choosePdf: 'PDFファイルを選択', chooseImages: '画像を選択', dropPdf: 'ここにPDFファイルをドロップ', dropImages: 'ここに画像をドロップ',
  mergeHint: '結合するPDFファイルを2つ以上選択してください', singleHint: '作業するPDFを1つ選択してください', imageHint: 'JPG・JPEG・PNG画像を追加してください',
  privacyHint: 'ブラウザ内で処理。ファイルはアップロードされません。', trustLocal: 'サーバーへの送信なし', trustDevice: 'お使いの端末で処理', trustDownload: '結果を端末に直接保存',
  downloadPendingHelp: '上のツールでファイルを変換するとダウンロードできます。',
  addFiles: 'ファイルを追加', clearAll: 'すべてクリア', remove: '削除', moveUp: '上へ移動', moveDown: '下へ移動', pages: 'ページ', page: 'ページ', files: 'ファイル',
  processing: '処理中…', download: '結果をダウンロード', startOver: '新しい作業を開始', editAgain: 'もう一度編集',
  mergeAction: 'PDFを結合', organizeAction: '編集したPDFを保存', imageAction: 'PDFを作成', pdfImageAction: '画像に変換',
  loadingPreview: 'ページのプレビューを準備しています…', selectAll: 'すべて選択', deselectAll: '選択を解除', deleteSelected: '選択ページを削除',
  rotateBy: '回転角度', restore: 'ページを戻す', saveChanges: '変更を保存', previewLabel: 'ページのプレビュー', skipToContent: '本文へ移動', outputName: '出力ファイル名',
  zipPages: 'ページ別PDFをZIPで保存',
  rotateSelected: '選択ページを回転', rotateAll: 'すべて回転', extractSelected: '選択ページを抽出',
  rangeLabel: '含めるページ', rangeHelp: '例：1-3, 5, 8-10。空欄の場合は全ページを含めます。', rangeApply: '範囲を適用',
  outputFormat: '出力形式', resolution: '解像度', quality: 'JPG画質', paper: '用紙サイズ', orientation: '向き', margin: '余白', fit: '画像の配置',
  a4: 'A4', letter: 'レター', original: '元の画像サイズ', auto: '自動', portrait: '縦', landscape: '横', contain: '画像全体を収める', cover: '用紙を埋める（端を切り抜く）',
  normal: '標準', high: '高', veryHigh: '最高', selected: 'ページを選択', deleted: '削除済み',
  preserveNotice: 'PDFを編集すると電子署名が無効になる場合があります。入力フォーム、しおりなどの機能は保持されないことがあります。',
  about: 'サービスについて', privacy: 'プライバシー', terms: '利用規約', contact: 'お問い合わせ', relatedTools: '関連ツール', howTo: '使い方', features: 'できること', faq: 'よくある質問',
  footerNote: '無料のPDFツール。ファイルはお使いの端末に残ります。', workingTitle: 'PDFEditGo', adNotice: '広告',
  contactNote: '公開用のサポート連絡先はまだ設定されていません。現在の状況はお問い合わせページをご覧ください。',
  "chooseWord": "Word・ハングルファイルを選択",
  "choosePpt": "PowerPointファイルを選択",
  "dropWord": "Wordまたはハングル文書をここにドロップ",
  "dropPpt": "ここにPowerPointファイルをドロップ",
  "officeWordHint": "20MB以下のDOCX・HWP 5.0・HWPX文書を1つ選択してください",
  "officePptHint": "20MB以下の.pptxファイルを1つ選択してください",
  "officeNotice": "各ページを画像としてPDFにするため、文字の選択・検索はできません。フォントや複雑なレイアウトが元の文書と異なる場合があります。DOCX・HWP 5.0・HWPX・PPTXに対応し、旧形式DOC・PPTと保護されたハングル文書には対応していません。",
  "officeAction": "PDFに変換",
  "officeLoading": "文書を準備しています…",
  tools: {
    'merge-pdf': { name: 'PDF結合', short: '複数のPDFを1つに', accept: 'application/pdf,.pdf' },
    'organize-pdf': { name: 'ページ編集', short: '分割・回転・削除', accept: 'application/pdf,.pdf' },
    'pdf-to-jpg': { name: 'PDFから画像', short: 'JPG・PNGで保存', accept: 'application/pdf,.pdf' },
    'jpg-to-pdf': { name: '画像からPDF', short: '画像をPDFに変換', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png' },
    "word-to-pdf": {"name": "Word/ハングル → PDF", "short": "DOCX · HWP · HWPX", "accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/hwp+zip,.docx,.hwp,.hwpx"},
    "ppt-to-pdf": {"name": "PPTからPDF", "short": "PPTXスライドを変換", "accept": "application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"},
  },
  errors: {
    "officeUnsupported": "Word・ハングルにはDOCX・HWP 5.0・HWPX、PowerPointにはPPTXを選択してください。旧形式DOC・PPT・HWP、パスワードやDRMで保護されたファイル、マクロ付き文書には対応していません。",
    "officeCorrupt": "文書を読み込めません。破損しているか、対応していない構造の可能性があります。",
    "officeTooLarge": "20MB以下の文書を選択してください。展開後の内容が極端に大きい文書には対応していません。",
    "officeRender": "ページを変換できませんでした。より簡単な文書を試し、フォント・画像・レイアウトを確認してください。",
    "officeBrowser": "お使いのブラウザは文書の描画に必要な機能に対応していません。最新版のChrome、Edge、Firefox、Safariをお試しください。",
    "officeLimit": "1回につき最大50ページ・スライドを出力できます。範囲を絞るか、解像度を下げてください。",
    "officeExternal": "外部リンク先の素材は読み込みません。画像などの素材が文書内に埋め込まれたファイルを使用してください。",
    tooManyFiles: '1回の作業で扱うファイルを30個以下にしてください。', totalSize: '選択したファイルの合計が100MBを超えています。分けて処理してください。',
    fileSize: '50MBを超えるファイルがあります。より小さいファイルを選択してください。', invalidPdf: 'このPDFを読み込めません。破損しているか、対応していない形式の可能性があります。',
    invalidImage: 'この画像を読み込めません。有効なJPGまたはPNGファイルを選択してください。', encrypted: '暗号化されたPDFやパスワード付きPDFには対応していません。暗号化されていないコピーを使用してください。',
    invalidRange: '1-3, 5のように有効なページ番号や範囲を指定し、ページが存在することを確認してください。', emptyPages: 'PDFには少なくとも1ページを残してください。',
    memoryLimit: '安全に処理するには作業が大きすぎます。ページ数、画像サイズ、解像度を下げてください。',
    needTwo: '結合するPDFファイルを2つ以上追加してください。', needOne: '続行するにはファイルを1つ選択してください。', unknown: '作業を完了できませんでした。より小さいファイルで試すか、最初からやり直してください。',
    tooManyPages: 'ページ編集は1文書につき200ページまで対応しています。ページ数の少ないPDFを選択してください。', invalidSelection: '続行するには利用可能なページを1つ以上選択してください。',
    unsupportedBrowser: 'お使いのブラウザは必要な機能に対応していません。最新版のChrome、Edge、Firefox、Safariをお試しください。',
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, ko, es, ja };
export const toolLabels: Record<Tool, ToolLabel> = en.tools;
export function getText(locale: Locale): Dictionary { return dictionaries[locale]; }
export function localePath(locale: Locale, path = ''): string {
  if (!locales.includes(locale)) throw new Error('Unsupported locale');
  const clean = path.replace(/^\/+|\/+$/g, '');
  if (clean && !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(clean)) {
    throw new Error('Invalid local path');
  }
  return `${locale === 'en' ? '/' : `/${locale}/`}${clean ? `${clean}/` : ''}`;
}

const content: Record<Locale, Record<Tool, ToolContent>> = {
  en: {
    "word-to-pdf": {
      "title": "Word and Hangul to PDF — DOCX, HWP and HWPX | PDFEditGo",
      "description": "Convert DOCX, HWP 5.0 and HWPX documents to image-based PDFs in your browser. Choose pages and resolution without uploading your documents.",
      "heading": "Convert Word or Hangul documents to PDF",
      "intro": "Choose a Word or Hangul document in one place. The file format selects the matching local conversion engine, and the result is a separate PDF made from page images.",
      "steps": [
        "Choose one unencrypted DOCX, HWP 5.0 or HWPX document of 20 MB or less.",
        "Choose the pages and output resolution. Leave the page range blank to include all pages.",
        "Convert the document, review the result and download the PDF to your device."
      ],
      "features": [
        "Detect the supported file format and use its matching conversion engine.",
        "Process files on your device without accounts, uploads or paid conversion APIs.",
        "Keep the original document unchanged and save up to 50 selected pages as a new image-based PDF."
      ],
      "faqs": [
        {
          "q": "Which Word and Hangul files are supported?",
          "a": "Use ordinary, unencrypted DOCX, HWP 5.0 or HWPX files of up to 20 MB. Older DOC and HWP formats, DRM-protected files, macro-enabled documents and externally linked resources are not supported."
        },
        {
          "q": "Can I select or search the PDF text?",
          "a": "No. Each page is rendered as an image inside the PDF. Keep the original document if you need editable, selectable or searchable text."
        },
        {
          "q": "Will fonts and page breaks match Word or Hangul exactly?",
          "a": "Exact reproduction is not guaranteed. Available fonts, complex tables, equations, drawings and pagination can differ. Check important pages in the downloaded PDF before using it."
        }
      ]
    },
    "ppt-to-pdf": {
      "title": "PPT to PDF locally — convert PPTX slides | PDFEditGo",
      "description": "Turn basic PPTX slides into an image-based PDF without uploads. Select slides, set resolution and download a local PDF from your browser.",
      "heading": "Convert PowerPoint slides to PDF",
      "intro": "Save the static appearance of PowerPoint slides as an image-based PDF. Use PPTX files with ordinary text, embedded pictures and shapes; complex slide content may render differently.",
      "steps": [
        "Choose one PPTX presentation of 20 MB or less.",
        "Select slides with a range such as 1-3, 5 and choose the output resolution.",
        "Convert the slides, review the PDF and download it to your device."
      ],
      "features": [
        "Convert in your browser while your presentation stays on your device.",
        "Choose which slides to include and preserve their page proportions.",
        "Save static slide images as a PDF without changing your original presentation."
      ],
      "faqs": [
        {
          "q": "Are animations, videos and audio included?",
          "a": "The PDF contains static slide images. Playback, transitions, animations and interactive actions are not preserved."
        },
        {
          "q": "Does the PDF keep searchable text?",
          "a": "No. This converter creates an image-based PDF, so its text cannot be selected or searched. Keep the PPTX for editable slide content."
        },
        {
          "q": "Which presentations work best?",
          "a": "Start with an unencrypted PPTX of 20 MB or less containing ordinary text, embedded pictures and basic shapes. Older PPT files and externally linked resources are not supported. Complex fonts, charts or layouts may differ; output is limited to 50 slides per task."
        }
      ]
    },
    'merge-pdf': {
      title: 'Merge PDF files locally — free PDF merger | PDFEditGo',
      description: 'Combine several PDF files into one in your browser. Arrange the files, check page counts and download your merged PDF without uploading documents.',
      heading: 'Merge PDF files in the order you choose',
      intro: 'Bring separate reports, scans or document sections together in a single PDF. The merger copies pages in your chosen file order and creates a new download on your device.',
      steps: ['Add at least two unencrypted PDF files.', 'Check the file names and page counts. Drag files or use the move buttons to set their order.', 'Select Merge PDFs, then download the combined file.'],
      features: ['Add or remove files before merging.', 'Set document order with a pointer, keyboard or touch-friendly move buttons.', 'Keep the original files unchanged and save a new PDF.'],
      faqs: [
        { q: 'Can I combine scanned PDFs?', a: 'Yes. Scanned pages can be copied into the merged PDF. This does not recognize or edit the text inside the scans.' },
        { q: 'Are my PDFs sent to a server?', a: 'No. File reading and merging happen in your browser. Only the website and its processing code are downloaded.' },
        { q: 'Will signatures and bookmarks be preserved?', a: 'Do not rely on the merged output to retain digital signatures, interactive forms, bookmarks or other document-level features. Review important documents after saving.' },
      ],
    },
    'organize-pdf': {
      title: 'Organize PDF pages — split, rotate and delete | PDFEditGo',
      description: 'Preview PDF pages, extract a page range, remove unwanted pages and rotate pages locally. Save the pages you need as a new PDF, with no upload.',
      heading: 'Keep the PDF pages you need',
      intro: 'Use page thumbnails to make focused edits to one PDF. Extract a range, remove a cover sheet, change page order or rotate a sideways page before saving a new document.',
      steps: ['Choose one unencrypted PDF and wait for the page thumbnails.', 'Select pages to rotate or delete, adjust their order, or apply a range such as 1-3, 5.', 'Save the edited PDF and check the downloaded document.'],
      features: ['Preview pages before deciding what to keep.', 'Rotate selected pages or the entire document in 90-degree steps.', 'Extract selected pages while keeping at least one page in the output.'],
      faqs: [
        { q: 'How do page ranges work?', a: 'Enter page numbers as shown in the document, starting at 1. Commas separate selections and a hyphen includes a range, for example 1-3, 5. A blank range includes every page.' },
        { q: 'Can I delete every page?', a: 'No. A saved PDF must contain at least one page. The tool prevents an empty result.' },
        { q: 'Can I edit the text on a page?', a: 'This tool organizes entire pages. It does not rewrite text, change fonts or remove individual objects inside a page.' },
      ],
    },
    'pdf-to-jpg': {
      title: 'Convert PDF to JPG or PNG locally | PDFEditGo',
      description: 'Turn PDF pages into JPG or PNG images in your browser. Choose pages, resolution and JPG quality, then download images individually or together in a ZIP.',
      heading: 'Turn PDF pages into images',
      intro: 'Render a whole PDF or a specific page range as images for sharing and reuse. Higher resolution produces more pixels and usually larger files, so choose a setting suited to your task.',
      steps: ['Choose a PDF and enter a page range if you only need certain pages.', 'Choose JPG or PNG, then set the resolution and JPG quality when available.', 'Convert the pages and download the image or ZIP archive.'],
      features: ['Export JPG for compact sharing or PNG for lossless image encoding.', 'Convert selected pages instead of the entire document.', 'Download multiple page images together in one ZIP file.'],
      faqs: [
        { q: 'Should I choose JPG or PNG?', a: 'JPG often makes smaller files for photographs but uses lossy compression. PNG avoids JPG compression artifacts and supports lossless encoding, though its files can be larger. Both outputs render the PDF page as pixels.' },
        { q: 'Does higher resolution restore missing detail?', a: 'No. It creates more output pixels but cannot recover detail absent from the source PDF or improve a low-resolution scan.' },
        { q: 'Why is a large conversion limited?', a: 'Rendering pages uses device memory. Convert fewer pages or choose a lower resolution if the browser cannot safely process the task.' },
      ],
    },
    'jpg-to-pdf': {
      title: 'Convert JPG and PNG images to PDF locally | PDFEditGo',
      description: 'Create one PDF from JPG, JPEG and PNG images. Arrange images and choose A4, Letter, orientation, margins and fit settings. No image uploads required.',
      heading: 'Create a PDF from your images',
      intro: 'Collect photos, receipts or scanned images into one PDF. Each image becomes a page, with the image order and page layout you choose.',
      steps: ['Add JPG, JPEG or PNG images and arrange them in order.', 'Choose a paper size, orientation, margin and image fit.', 'Create the PDF and download the result to your device.'],
      features: ['Combine multiple images into a single document.', 'Use A4, US Letter or the original image dimensions.', 'Fit the full image on a page or fill the page by cropping the edges.'],
      faqs: [
        { q: 'Will my pictures be stretched?', a: 'The image aspect ratio is maintained. Fit keeps the whole image visible; Fill covers the available area and may crop the image edges.' },
        { q: 'Are transparent PNG images supported?', a: 'Yes. PNG input is supported. The resulting PDF page is normally displayed on a white background.' },
        { q: 'Does the tool change my original images?', a: 'No. It reads the selected images and creates a separate PDF download. Your original files remain unchanged.' },
      ],
    },
  },
  ko: {
    "word-to-pdf": {
      "title": "워드·한글을 PDF로 변환 — DOCX·HWP·HWPX | PDFEditGo",
      "description": "DOCX·HWP 5.0·HWPX 문서를 브라우저에서 이미지형 PDF로 변환하세요. 파일 업로드 없이 페이지 범위와 해상도를 선택하고 저장합니다.",
      "heading": "워드 또는 한글 문서를 PDF로 변환",
      "intro": "워드와 한글 파일을 한곳에서 선택하세요. 파일 형식에 맞는 변환 엔진을 자동으로 선택해 내 기기에서 처리하고, 페이지 이미지를 담은 별도의 PDF를 만듭니다.",
      "steps": [
        "20MB 이하의 암호 없는 DOCX·HWP 5.0·HWPX 문서 하나를 선택하세요.",
        "페이지 범위와 출력 해상도를 선택하세요. 범위를 비워 두면 모든 페이지를 포함합니다.",
        "문서를 변환하고 결과를 확인한 뒤 PDF를 내 기기에 내려받으세요."
      ],
      "features": [
        "지원 파일의 실제 형식을 확인해 맞는 변환 엔진을 자동으로 사용합니다.",
        "회원가입·파일 업로드·유료 변환 API 없이 내 기기에서 처리합니다.",
        "원본을 변경하지 않고 선택한 최대 50페이지를 별도의 이미지형 PDF로 저장합니다."
      ],
      "faqs": [
        {
          "q": "어떤 워드·한글 파일을 지원하나요?",
          "a": "20MB 이하의 일반적인 암호 없는 DOCX·HWP 5.0·HWPX 파일을 지원합니다. 이전 DOC·HWP 형식, DRM 보호 파일, 매크로 문서, 외부 주소에 연결된 자료는 지원하지 않습니다."
        },
        {
          "q": "PDF의 글자를 선택하거나 검색할 수 있나요?",
          "a": "아니요. 각 페이지를 이미지로 만들어 PDF에 넣습니다. 글자 편집·선택·검색이 필요하면 원본 문서를 보관해 주세요."
        },
        {
          "q": "워드나 한글과 글꼴·페이지 구성이 완전히 같나요?",
          "a": "완전히 같은 결과를 보장하지는 않습니다. 사용할 수 있는 글꼴과 복잡한 표·수식·도형·페이지 나눔에 따라 차이가 날 수 있습니다. 중요한 페이지는 다운로드한 PDF에서 직접 확인해 주세요."
        }
      ]
    },
    "ppt-to-pdf": {
      "title": "PPT를 PDF로 변환 — PPTX 로컬 변환 | PDFEditGo",
      "description": "기본 PPTX 슬라이드를 업로드 없이 이미지형 PDF로 만드세요. 슬라이드 범위와 해상도를 선택하고 브라우저에서 변환해 내려받습니다.",
      "heading": "파워포인트 슬라이드를 PDF로 변환",
      "intro": "파워포인트 슬라이드의 정적인 모습을 이미지형 PDF로 저장합니다. 일반 글자, 문서 안에 포함된 사진, 기본 도형 중심의 PPTX를 사용할 수 있으며 복잡한 슬라이드는 원본과 다를 수 있습니다.",
      "steps": [
        "20MB 이하의 PPTX 프레젠테이션 하나를 선택하세요.",
        "1-3, 5처럼 포함할 슬라이드 범위와 출력 해상도를 정하세요.",
        "변환한 PDF의 모습을 확인하고 내 기기에 내려받으세요."
      ],
      "features": [
        "프레젠테이션 파일을 전송하지 않고 브라우저에서 변환합니다.",
        "필요한 슬라이드를 선택하고 슬라이드의 가로세로 비율을 유지합니다.",
        "원본 프레젠테이션은 변경하지 않고 정적인 슬라이드 이미지를 PDF로 만듭니다."
      ],
      "faqs": [
        {
          "q": "애니메이션, 동영상, 소리도 포함되나요?",
          "a": "PDF에는 정적인 슬라이드 이미지만 담습니다. 재생, 전환 효과, 애니메이션과 상호작용은 유지하지 않습니다."
        },
        {
          "q": "PDF에서 글자를 검색할 수 있나요?",
          "a": "아니요. 이미지형 PDF를 만들므로 글자를 선택하거나 검색할 수 없습니다. 편집할 슬라이드가 필요하면 PPTX 원본을 보관해 주세요."
        },
        {
          "q": "어떤 프레젠테이션부터 사용하면 좋나요?",
          "a": "일반 글자, 문서 안에 포함된 사진, 기본 도형이 있는 20MB 이하의 암호화되지 않은 PPTX부터 사용해 보세요. 이전 PPT 형식과 외부 주소의 자료는 지원하지 않습니다. 복잡한 글꼴·차트·배치는 달라질 수 있으며, 한 작업의 출력은 최대 50슬라이드입니다."
        }
      ]
    },
    'merge-pdf': {
      title: 'PDF 합치기 — 업로드 없는 무료 PDF 병합 | PDFEditGo',
      description: '여러 PDF를 브라우저에서 하나로 합치세요. 파일 순서와 페이지 수를 확인하고 서버 업로드 없이 병합한 PDF를 내려받을 수 있습니다.',
      heading: '원하는 순서대로 PDF 합치기',
      intro: '여러 보고서, 스캔 문서 또는 나누어진 자료를 하나의 PDF로 모으세요. 지정한 파일 순서대로 페이지를 복사해 내 기기에 저장할 새 PDF를 만듭니다.',
      steps: ['암호화되지 않은 PDF 파일을 두 개 이상 추가하세요.', '파일명과 페이지 수를 확인하고 드래그하거나 이동 버튼으로 순서를 정하세요.', 'PDF 합치기를 누르고 완성된 파일을 내려받으세요.'],
      features: ['병합 전에 파일을 추가하거나 제거할 수 있습니다.', '드래그와 키보드·터치로 사용할 수 있는 이동 버튼을 제공합니다.', '원본을 변경하지 않고 새 PDF로 저장합니다.'],
      faqs: [
        { q: '스캔한 PDF도 합칠 수 있나요?', a: '네. 스캔한 페이지도 새 PDF로 복사할 수 있습니다. 스캔 이미지 안의 글자를 인식하거나 수정하는 기능은 포함하지 않습니다.' },
        { q: 'PDF가 서버로 전송되나요?', a: '아니요. 파일 읽기와 병합은 브라우저에서 이루어집니다. 웹사이트 화면과 처리 코드만 인터넷에서 불러옵니다.' },
        { q: '전자서명과 북마크도 유지되나요?', a: '기존 전자서명, 입력 양식, 북마크 등 문서 부가 기능의 보존은 보장하지 않습니다. 중요한 문서는 저장한 결과를 확인해 주세요.' },
      ],
    },
    'organize-pdf': {
      title: 'PDF 페이지 편집 — 나누기·회전·삭제 | PDFEditGo',
      description: 'PDF 썸네일을 보며 페이지를 추출하고 불필요한 페이지를 삭제하거나 회전하세요. 업로드 없이 필요한 페이지를 새 PDF로 저장합니다.',
      heading: '필요한 PDF 페이지만 남기세요',
      intro: '한 PDF의 페이지를 미리 보면서 편집하세요. 특정 범위를 추출하고, 표지를 삭제하고, 순서를 바꾸거나 옆으로 누운 페이지를 회전한 뒤 새 문서로 저장할 수 있습니다.',
      steps: ['암호화되지 않은 PDF 하나를 선택하고 페이지 미리보기를 기다리세요.', '회전하거나 삭제할 페이지를 선택하고, 순서를 바꾸거나 1-3, 5 같은 범위를 적용하세요.', '편집한 PDF를 저장하고 내려받은 문서를 확인하세요.'],
      features: ['페이지를 미리 보고 필요한 부분을 선택합니다.', '선택한 페이지 또는 전체 문서를 90°씩 회전합니다.', '최소 한 페이지를 남기면서 원하는 페이지만 추출합니다.'],
      faqs: [
        { q: '페이지 범위는 어떻게 입력하나요?', a: '첫 페이지를 1로 계산합니다. 1-3, 5처럼 쉼표로 구분하고 하이픈으로 연속 범위를 지정하세요. 범위를 비워 두면 모든 페이지를 포함합니다.' },
        { q: '모든 페이지를 삭제할 수 있나요?', a: '아니요. 결과 PDF에는 최소 한 페이지가 필요하므로 빈 문서가 되는 작업을 방지합니다.' },
        { q: '페이지 안의 글자를 수정할 수 있나요?', a: '이 도구는 페이지 단위로 문서를 정리합니다. 본문 수정, 글꼴 변경, 페이지 내부 개체 삭제는 지원하지 않습니다.' },
      ],
    },
    'pdf-to-jpg': {
      title: 'PDF를 JPG·PNG 이미지로 변환 | PDFEditGo',
      description: 'PDF 페이지를 브라우저에서 JPG 또는 PNG로 변환하세요. 페이지, 해상도, JPG 품질을 선택하고 이미지나 ZIP으로 내려받을 수 있습니다.',
      heading: 'PDF 페이지를 이미지로 저장하세요',
      intro: '전체 PDF나 특정 페이지 범위를 공유하기 쉬운 이미지로 변환하세요. 해상도를 높이면 픽셀 수와 파일 용량이 늘어나므로 사용 목적에 맞게 선택하는 것이 좋습니다.',
      steps: ['PDF를 선택하고 필요한 경우 변환할 페이지 범위를 입력하세요.', 'JPG 또는 PNG를 선택하고 해상도와 JPG 품질을 설정하세요.', '페이지를 변환한 뒤 이미지 또는 ZIP 파일을 내려받으세요.'],
      features: ['용량을 줄이기 쉬운 JPG와 무손실 인코딩을 사용하는 PNG를 지원합니다.', '전체 문서 대신 필요한 페이지만 변환할 수 있습니다.', '여러 페이지 이미지를 ZIP 파일 하나로 내려받습니다.'],
      faqs: [
        { q: 'JPG와 PNG 중 무엇을 선택하면 되나요?', a: 'JPG는 사진에서 용량이 작은 편이지만 손실 압축을 사용합니다. PNG는 JPG 압축 흔적을 피할 수 있으나 파일이 더 클 수 있습니다. 두 형식 모두 PDF 페이지를 픽셀 이미지로 만듭니다.' },
        { q: '해상도를 높이면 원본의 흐릿함이 사라지나요?', a: '아니요. 출력 픽셀 수는 늘어나지만 원본에 없는 세부 정보를 복원하거나 저해상도 스캔을 선명하게 만들지는 못합니다.' },
        { q: '큰 작업은 왜 제한되나요?', a: '페이지 렌더링에 기기 메모리가 필요하기 때문입니다. 작업이 너무 크면 페이지 수나 해상도를 줄여 주세요.' },
      ],
    },
    'jpg-to-pdf': {
      title: 'JPG·PNG 이미지를 PDF로 변환 | PDFEditGo',
      description: 'JPG, JPEG, PNG 이미지를 하나의 PDF로 만드세요. 이미지 순서와 A4·Letter 용지, 방향, 여백, 맞춤을 설정하며 서버에 업로드하지 않습니다.',
      heading: '여러 이미지를 하나의 PDF로',
      intro: '사진, 영수증 또는 스캔 이미지를 PDF 하나로 모으세요. 지정한 이미지 순서와 용지 설정에 따라 이미지마다 한 페이지를 만듭니다.',
      steps: ['JPG, JPEG 또는 PNG 이미지를 추가하고 순서를 정하세요.', '용지 크기, 방향, 여백과 이미지 맞춤을 선택하세요.', 'PDF를 만들고 내 기기로 내려받으세요.'],
      features: ['여러 이미지를 한 문서로 모읍니다.', 'A4, Letter 또는 원본 이미지 크기를 사용할 수 있습니다.', '이미지 전체를 맞추거나 가장자리를 잘라 용지를 채울 수 있습니다.'],
      faqs: [
        { q: '이미지가 늘어나거나 찌그러지나요?', a: '가로세로 비율을 유지합니다. 전체 맞추기는 이미지를 모두 보여주고, 용지 채우기는 여백 영역을 채우면서 가장자리가 잘릴 수 있습니다.' },
        { q: '투명 배경 PNG도 사용할 수 있나요?', a: '네. PNG 입력을 지원합니다. 결과 PDF 페이지는 일반적으로 흰 배경 위에 표시됩니다.' },
        { q: '원본 이미지 파일도 변경되나요?', a: '아니요. 선택한 이미지를 읽어 별도의 PDF를 만듭니다. 원본 파일은 그대로 유지됩니다.' },
      ],
    },
  },
  es: {
    "word-to-pdf": {
      "title": "Word y Hangul a PDF — DOCX, HWP y HWPX | PDFEditGo",
      "description": "Convierte documentos DOCX, HWP 5.0 y HWPX a PDF de imágenes en tu navegador. Elige páginas y resolución sin subir tus documentos.",
      "heading": "Convierte documentos Word o Hangul a PDF",
      "intro": "Selecciona un documento Word o Hangul en un mismo lugar. Su formato determina el motor de conversión local y el resultado es un PDF independiente con imágenes de las páginas.",
      "steps": [
        "Elige un DOCX, HWP 5.0 o HWPX sin cifrar de hasta 20 MB.",
        "Selecciona las páginas y la resolución. Deja el intervalo vacío para incluir todas las páginas.",
        "Convierte el documento, revisa el resultado y descarga el PDF en tu dispositivo."
      ],
      "features": [
        "Detecta el formato compatible y utiliza el motor de conversión correspondiente.",
        "Procesa documentos en tu dispositivo sin cuentas, subidas ni API de conversión de pago.",
        "Conserva el original y guarda hasta 50 páginas seleccionadas en un nuevo PDF de imágenes."
      ],
      "faqs": [
        {
          "q": "¿Qué archivos Word y Hangul se admiten?",
          "a": "Utiliza DOCX, HWP 5.0 o HWPX normales, sin cifrar y de hasta 20 MB. No se admiten DOC/HWP antiguos, archivos con DRM, documentos con macros ni recursos externos enlazados."
        },
        {
          "q": "¿Puedo seleccionar o buscar el texto del PDF?",
          "a": "No. Cada página se representa como una imagen dentro del PDF. Conserva el documento original si necesitas texto editable, seleccionable o que se pueda buscar."
        },
        {
          "q": "¿Se conservarán exactamente las fuentes y los saltos de página?",
          "a": "No se garantiza una reproducción exacta. Las fuentes disponibles, las tablas complejas, las ecuaciones, los dibujos y la paginación pueden variar. Revisa las páginas importantes del PDF descargado."
        }
      ]
    },
    "ppt-to-pdf": {
      "title": "PPT a PDF local — convierte diapositivas PPTX | PDFEditGo",
      "description": "Convierte diapositivas PPTX sencillas en un PDF de imágenes sin subir archivos. Selecciona diapositivas y resolución y descarga el resultado desde tu navegador.",
      "heading": "Convierte PowerPoint a PDF",
      "intro": "Guarda el aspecto estático de las diapositivas PowerPoint como un PDF de imágenes. Utiliza PPTX con texto, imágenes incorporadas y formas; los elementos complejos pueden verse distintos.",
      "steps": [
        "Elige una presentación PPTX de hasta 20 MB.",
        "Selecciona diapositivas con un intervalo como 1-3, 5 y elige la resolución.",
        "Convierte las diapositivas, revisa el PDF y descárgalo en tu dispositivo."
      ],
      "features": [
        "Convierte en el navegador mientras tu presentación permanece en tu dispositivo.",
        "Elige las diapositivas y conserva sus proporciones.",
        "Guarda imágenes estáticas de las diapositivas sin modificar la presentación original."
      ],
      "faqs": [
        {
          "q": "¿Se incluyen animaciones, vídeos y sonido?",
          "a": "El PDF contiene imágenes estáticas. No conserva reproducción, transiciones, animaciones ni acciones interactivas."
        },
        {
          "q": "¿Se puede buscar texto en el PDF?",
          "a": "No. Esta herramienta crea un PDF de imágenes y no permite seleccionar ni buscar texto. Conserva el PPTX para editar su contenido."
        },
        {
          "q": "¿Con qué presentaciones conviene empezar?",
          "a": "Prueba un PPTX sin cifrar de hasta 20 MB con texto normal, imágenes incorporadas y formas básicas. No se admiten PPT antiguos ni recursos externos enlazados. Las fuentes, los gráficos y los diseños complejos pueden variar; la salida se limita a 50 diapositivas por tarea."
        }
      ]
    },
    'merge-pdf': {
      title: 'Unir archivos PDF gratis sin subirlos | PDFEditGo',
      description: 'Combina varios PDF en uno desde tu navegador. Ordena archivos, consulta el número de páginas y descarga el PDF unido sin subir documentos.',
      heading: 'Une archivos PDF en el orden que prefieras',
      intro: 'Reúne informes, escaneos o secciones de un documento en un solo PDF. La herramienta copia las páginas según el orden elegido y crea una descarga nueva en tu dispositivo.',
      steps: ['Añade al menos dos archivos PDF sin cifrar.', 'Comprueba los nombres y las páginas. Arrastra los archivos o utiliza los botones para ordenarlos.', 'Pulsa Unir PDF y descarga el archivo combinado.'],
      features: ['Añade o quita archivos antes de unirlos.', 'Ordena documentos con el puntero o con botones accesibles desde el teclado y la pantalla táctil.', 'Conserva los originales y guarda un PDF nuevo.'],
      faqs: [
        { q: '¿Puedo unir PDF escaneados?', a: 'Sí. Las páginas escaneadas se pueden copiar al PDF combinado. Esta operación no reconoce ni modifica el texto del escaneo.' },
        { q: '¿Se envían mis PDF a un servidor?', a: 'No. La lectura y la unión se realizan en tu navegador. Solo se descargan la web y el código de procesamiento.' },
        { q: '¿Se conservan las firmas y los marcadores?', a: 'No se garantiza conservar firmas digitales, formularios interactivos, marcadores u otras funciones del documento. Revisa el resultado si el documento es importante.' },
      ],
    },
    'organize-pdf': {
      title: 'Organizar páginas PDF: dividir, girar y eliminar | PDFEditGo',
      description: 'Previsualiza páginas PDF, extrae intervalos, elimina páginas y gíralas en tu navegador. Guarda las páginas necesarias en un nuevo PDF sin subirlo.',
      heading: 'Conserva las páginas PDF que necesitas',
      intro: 'Edita un PDF utilizando sus miniaturas. Extrae un intervalo, elimina una portada, cambia el orden o gira una página antes de guardar un documento nuevo.',
      steps: ['Elige un PDF sin cifrar y espera a que aparezcan las miniaturas.', 'Selecciona páginas para girarlas o eliminarlas, cambia su orden o aplica un intervalo como 1-3, 5.', 'Guarda el PDF editado y comprueba el documento descargado.'],
      features: ['Revisa las páginas antes de decidir cuáles conservar.', 'Gira las páginas seleccionadas o todo el documento en pasos de 90 grados.', 'Extrae páginas seleccionadas y conserva al menos una en el resultado.'],
      faqs: [
        { q: '¿Cómo se indican los intervalos?', a: 'La primera página es la 1. Separa selecciones con comas y usa un guion para intervalos, por ejemplo 1-3, 5. Un campo vacío incluye todas las páginas.' },
        { q: '¿Puedo eliminar todas las páginas?', a: 'No. El PDF guardado debe tener al menos una página. La herramienta impide crear un resultado vacío.' },
        { q: '¿Puedo editar el texto de una página?', a: 'La herramienta organiza páginas completas. No modifica texto, cambia fuentes ni elimina objetos individuales dentro de las páginas.' },
      ],
    },
    'pdf-to-jpg': {
      title: 'Convertir PDF a JPG o PNG sin subir archivos | PDFEditGo',
      description: 'Convierte páginas PDF a JPG o PNG en tu navegador. Elige páginas, resolución y calidad JPG, y descarga una imagen o varias en un ZIP.',
      heading: 'Convierte páginas PDF en imágenes',
      intro: 'Convierte todo un PDF o un intervalo en imágenes para compartirlas o reutilizarlas. Una resolución mayor produce más píxeles y, normalmente, archivos más grandes.',
      steps: ['Elige un PDF e indica un intervalo si solo necesitas algunas páginas.', 'Selecciona JPG o PNG y ajusta la resolución y, cuando corresponda, la calidad JPG.', 'Convierte las páginas y descarga la imagen o el archivo ZIP.'],
      features: ['Exporta a JPG para compartir archivos ligeros o a PNG con codificación sin pérdida.', 'Convierte páginas concretas en lugar del documento completo.', 'Descarga varias imágenes de página juntas en un ZIP.'],
      faqs: [
        { q: '¿Conviene elegir JPG o PNG?', a: 'JPG suele ocupar menos con fotografías, pero usa compresión con pérdida. PNG evita los artefactos de JPG, aunque puede generar archivos mayores. Ambos formatos representan la página PDF como píxeles.' },
        { q: '¿Una resolución mayor recupera los detalles?', a: 'No. Aumenta los píxeles de salida, pero no recupera información ausente en el PDF ni mejora un escaneo de baja resolución.' },
        { q: '¿Por qué se limita una conversión grande?', a: 'Renderizar páginas consume memoria del dispositivo. Si la tarea es demasiado grande, selecciona menos páginas o una resolución menor.' },
      ],
    },
    'jpg-to-pdf': {
      title: 'Convertir imágenes JPG y PNG a PDF | PDFEditGo',
      description: 'Crea un PDF con imágenes JPG, JPEG y PNG. Ordena las imágenes y elige A4, Carta, orientación, márgenes y ajuste sin subir archivos.',
      heading: 'Crea un PDF a partir de tus imágenes',
      intro: 'Reúne fotos, recibos o imágenes escaneadas en un PDF. Cada imagen se convierte en una página, siguiendo el orden y el diseño elegidos.',
      steps: ['Añade imágenes JPG, JPEG o PNG y ordénalas.', 'Selecciona el tamaño de papel, la orientación, el margen y el ajuste de imagen.', 'Crea el PDF y descarga el resultado en tu dispositivo.'],
      features: ['Combina varias imágenes en un documento.', 'Utiliza A4, Carta o las dimensiones originales de la imagen.', 'Muestra la imagen completa o llena la página recortando los bordes.'],
      faqs: [
        { q: '¿Se deformarán mis imágenes?', a: 'Se mantiene la proporción de la imagen. El ajuste completo la muestra entera; llenar la página cubre el espacio disponible y puede recortar los bordes.' },
        { q: '¿Admite PNG con transparencia?', a: 'Sí. Se aceptan imágenes PNG. La página PDF resultante normalmente se muestra sobre fondo blanco.' },
        { q: '¿Se modifican mis imágenes originales?', a: 'No. Se leen las imágenes seleccionadas para crear una descarga PDF independiente. Los archivos originales no cambian.' },
      ],
    },
  },
  ja: {
    "word-to-pdf": {
      "title": "Word・ハングルからPDF — DOCX・HWP・HWPX | PDFEditGo",
      "description": "DOCX・HWP 5.0・HWPX文書をブラウザ内で画像形式のPDFに変換。アップロードせずにページ範囲と解像度を選び、保存できます。",
      "heading": "Word・ハングル文書をPDFに変換",
      "intro": "Wordとハングルの文書を同じ場所から選択できます。ファイル形式に合う変換エンジンを自動で選び、端末内でページ画像を収めた別のPDFを作成します。",
      "steps": [
        "20MB以下の暗号化されていないDOCX・HWP 5.0・HWPX文書を1つ選択します。",
        "ページ範囲と出力解像度を選びます。空欄の場合は全ページを含めます。",
        "文書を変換し、結果を確認してPDFを端末にダウンロードします。"
      ],
      "features": [
        "対応するファイルの形式を確認し、適した変換エンジンを自動で使用します。",
        "登録、アップロード、有料変換APIなしで端末内で処理します。",
        "元の文書は変更せず、選択した最大50ページを新しい画像形式のPDFに保存します。"
      ],
      "faqs": [
        {
          "q": "どのWord・ハングルファイルに対応していますか？",
          "a": "20MB以下の通常の暗号化されていないDOCX・HWP 5.0・HWPXに対応します。旧形式DOC・HWP、DRM付きファイル、マクロ付き文書、外部リンクの素材には対応していません。"
        },
        {
          "q": "PDFの文字を選択・検索できますか？",
          "a": "できません。各ページを画像にしてPDFに収めます。文字の編集・選択・検索が必要な場合は元の文書を保管してください。"
        },
        {
          "q": "フォントや改ページはWord・ハングルと完全に同じになりますか？",
          "a": "完全に同じ表示は保証できません。使用できるフォント、複雑な表・数式・図形、改ページによって違いが生じる場合があります。重要なページはダウンロードしたPDFで確認してください。"
        }
      ]
    },
    "ppt-to-pdf": {
      "title": "PPTからPDF — PPTXスライドをローカル変換 | PDFEditGo",
      "description": "基本的なPPTXスライドをアップロードなしで画像形式のPDFに。スライド範囲と解像度を選び、ブラウザ内で変換・保存します。",
      "heading": "PowerPointスライドをPDFに変換",
      "intro": "PowerPointスライドの静止画を画像形式のPDFとして保存します。通常の文字、埋め込まれた画像、図形を含むPPTXに対応し、複雑な内容は元の表示と異なる場合があります。",
      "steps": [
        "20MB以下のPPTXファイルを1つ選択します。",
        "1-3, 5などのスライド範囲と出力解像度を選びます。",
        "変換したPDFを確認して、端末にダウンロードします。"
      ],
      "features": [
        "プレゼンテーションを送信せず、ブラウザ内で変換します。",
        "必要なスライドを選び、元の縦横比を保ちます。",
        "元のプレゼンテーションは変更せず、静止画のPDFを作成します。"
      ],
      "faqs": [
        {
          "q": "アニメーション、動画、音声も含まれますか？",
          "a": "PDFにはスライドの静止画のみを収めます。再生、切り替え効果、アニメーション、操作機能は保持されません。"
        },
        {
          "q": "PDFの文字を検索できますか？",
          "a": "できません。画像形式のPDFを作成するため、文字の選択・検索はできません。編集可能なスライドが必要な場合はPPTXを保管してください。"
        },
        {
          "q": "どのような資料から試すとよいですか？",
          "a": "通常の文字、埋め込まれた画像、基本図形を含む、20MB以下の暗号化されていないPPTXからお試しください。旧形式PPTや外部リンクの素材には対応していません。複雑なフォント・グラフ・レイアウトは異なる場合があり、出力は1回につき50スライドまでです。"
        }
      ]
    },
    'merge-pdf': {
      title: 'PDF結合 — アップロード不要の無料ツール | PDFEditGo',
      description: 'ブラウザで複数のPDFを1つに結合。ファイルの順序やページ数を確認し、書類をアップロードせずに結合したPDFを保存できます。',
      heading: '好きな順序でPDFを結合',
      intro: '別々の報告書、スキャン書類、資料の各章を1つのPDFにまとめます。指定したファイル順でページをコピーし、お使いの端末に保存する新しいPDFを作成します。',
      steps: ['暗号化されていないPDFを2つ以上追加します。', 'ファイル名とページ数を確認し、ドラッグまたは移動ボタンで順序を決めます。', '「PDFを結合」を押して、完成したファイルをダウンロードします。'],
      features: ['結合前にファイルを追加・削除できます。', 'ドラッグに加え、キーボードやタッチ操作で使える移動ボタンを用意しています。', '元のファイルは変更せず、新しいPDFを作成します。'],
      faqs: [
        { q: 'スキャンしたPDFも結合できますか？', a: 'はい。スキャンしたページも結合先のPDFにコピーできます。画像内の文字を認識・編集する機能は含まれません。' },
        { q: 'PDFはサーバーに送られますか？', a: 'いいえ。ファイルの読み込みと結合はブラウザ内で行います。インターネットから読み込むのはサイトと処理コードです。' },
        { q: '電子署名やしおりは保持されますか？', a: '電子署名、入力フォーム、しおりなどの保持は保証されません。重要な書類は保存後に内容を確認してください。' },
      ],
    },
    'organize-pdf': {
      title: 'PDFページ編集 — 分割・回転・削除 | PDFEditGo',
      description: 'PDFのサムネイルを見ながらページを抽出・削除・回転。アップロードせずに必要なページを新しいPDFとして保存できます。',
      heading: '必要なPDFページを残す',
      intro: 'サムネイルを見ながら1つのPDFを整理します。範囲の抽出、表紙の削除、ページ順の変更、横向きページの回転を行い、新しい文書として保存できます。',
      steps: ['暗号化されていないPDFを1つ選び、プレビューを待ちます。', '回転・削除するページを選択し、順序を変更するか、1-3, 5のような範囲を適用します。', '編集したPDFを保存し、ダウンロードした文書を確認します。'],
      features: ['プレビューを確認して残すページを選べます。', '選択ページまたは全ページを90度ずつ回転できます。', '最低1ページを残しながら、選んだページを抽出できます。'],
      faqs: [
        { q: 'ページ範囲はどう入力しますか？', a: '最初のページを1として指定します。1-3, 5のように、カンマで区切り、ハイフンで連続範囲を示します。空欄の場合は全ページを含めます。' },
        { q: 'すべてのページを削除できますか？', a: 'いいえ。保存するPDFには最低1ページが必要です。空の結果を作る操作は防止されます。' },
        { q: 'ページ内の文章を編集できますか？', a: 'このツールはページ単位の整理に対応します。文章の書き換え、フォントの変更、ページ内の個別オブジェクトの削除は行えません。' },
      ],
    },
    'pdf-to-jpg': {
      title: 'PDFをJPG・PNG画像に変換 | PDFEditGo',
      description: 'PDFページをブラウザでJPG・PNGに変換。ページ範囲、解像度、JPG画質を指定し、画像またはZIPでダウンロードできます。',
      heading: 'PDFページを画像として保存',
      intro: 'PDF全体や指定範囲を、共有・再利用しやすい画像にします。解像度を上げると画素数が増え、通常はファイルも大きくなるため、用途に合わせて選んでください。',
      steps: ['PDFを選択し、必要に応じてページ範囲を入力します。', 'JPGまたはPNGを選び、解像度とJPG画質を設定します。', 'ページを変換し、画像またはZIPをダウンロードします。'],
      features: ['共有に使いやすいJPGと、可逆圧縮のPNGで出力できます。', '文書全体ではなく必要なページだけを変換できます。', '複数ページの画像を1つのZIPでまとめて保存できます。'],
      faqs: [
        { q: 'JPGとPNGのどちらを選べばよいですか？', a: 'JPGは写真で容量を抑えやすい一方、非可逆圧縮を使用します。PNGはJPGの圧縮ノイズを避けられますが、容量が大きくなることがあります。どちらもPDFページを画素に変換します。' },
        { q: '解像度を上げると失われた情報を復元できますか？', a: 'いいえ。出力画素数は増えますが、元のPDFにない情報を復元したり、低解像度のスキャンを鮮明にしたりすることはできません。' },
        { q: '大きな変換に制限があるのはなぜですか？', a: 'ページの描画には端末のメモリを使用します。安全に処理できない場合はページ数や解像度を下げてください。' },
      ],
    },
    'jpg-to-pdf': {
      title: 'JPG・PNG画像をPDFに変換 | PDFEditGo',
      description: 'JPG・JPEG・PNG画像から1つのPDFを作成。画像の順序、A4・レター用紙、向き、余白、配置を指定できます。アップロード不要。',
      heading: '画像を1つのPDFにまとめる',
      intro: '写真、領収書、スキャン画像を1つのPDFにまとめます。指定した順序と用紙設定に合わせ、画像ごとに1ページを作成します。',
      steps: ['JPG・JPEG・PNG画像を追加し、順序を決めます。', '用紙サイズ、向き、余白、画像の配置を選びます。', 'PDFを作成し、結果をお使いの端末に保存します。'],
      features: ['複数の画像を1つの文書にまとめます。', 'A4、レター、元の画像サイズを選べます。', '画像全体を収めるか、端を切り抜いて用紙を埋めるかを選べます。'],
      faqs: [
        { q: '画像が引き伸ばされますか？', a: '画像の縦横比は保持されます。「画像全体を収める」は全体を表示し、「用紙を埋める」は利用可能な領域を埋めるため端を切り抜く場合があります。' },
        { q: '透過PNGも使えますか？', a: 'はい。PNG画像に対応しています。作成したPDFページは通常、白い背景の上に表示されます。' },
        { q: '元の画像ファイルも変更されますか？', a: 'いいえ。選択した画像を読み込んで別のPDFを作成します。元のファイルは変更されません。' },
      ],
    },
  },
};

export function toolContent(locale: Locale, tool: Tool): ToolContent { return content[locale][tool]; }

const legal: Record<Locale, Record<LegalSlug, LegalContent>> = {
  en: {
    about: {
      title: 'About PDFEditGo', description: 'Learn how PDFEditGo provides free browser-based PDF tools without file uploads or accounts.',
      paragraphs: ['PDFEditGo helps you combine PDFs, organize pages, export page images and create PDFs from images. The document tools also convert DOCX, HWP 5.0, HWPX and PPTX files to image-based PDFs. It is designed for ordinary PDF tasks in a browser, without an account or a paid conversion service.', 'The tools read files you explicitly select and process them on your device. Your originals are not modified. The result is a separate file that you choose to download.', 'Processing depends on your browser and available memory. Encrypted or damaged PDFs and unusually large tasks may not be supported. Review important output before relying on it.'],
    },
    privacy: {
      title: 'Privacy policy', description: 'How PDFEditGo handles selected files, browser memory and website access data.',
      paragraphs: ['Your selected PDF, Word, Hangul, PowerPoint and image contents are processed in your browser. They are not uploaded to, stored on or converted by our servers. Generated documents and images remain in your browser until you download them or end the task.', 'Files you download are saved according to your browser settings. Closing the page releases its browser session resources; downloaded files remain on your device until you remove them. The site stores only your chosen language preference in browser local storage. Selected files and generated results are not saved to local storage or IndexedDB. On the first homepage visit, the browser’s preferred languages may select an available language automatically. Explicit language links and your saved manual choice take priority. No IP-based country lookup or geolocation API is used.', 'Delivering the website requires normal network requests. The hosting provider may process access information such as IP addresses, request times, browser details and security logs under its own policies. Local file processing does not mean that visiting the website creates no network records.', 'This version sets no cookies and includes no advertising or analytics trackers. If these services are introduced, this policy and the necessary consent controls must be updated before they are activated.', 'Do not use this service on a device or in a browser environment you do not trust. Browser extensions and other software on your device are outside this site’s control.'],
    },
    terms: {
      title: 'Terms of service', description: 'Conditions for using the free browser-based tools provided by PDFEditGo.',
      paragraphs: ['Use these tools only with files you are authorized to process. You retain responsibility for your documents, their contents and your use of the output.', 'The tools are provided without an account or a per-use charge. Practical limits on file size, file count, page count or rendering resolution protect browser memory; they are not a promise that every document will be supported.', 'Keep your original files and review downloaded results. Editing may invalidate digital signatures, and document features such as bookmarks or interactive forms may not be preserved.', 'The service is provided as available, without a guarantee of uninterrupted availability or fitness for a particular purpose, to the extent permitted by applicable law. These terms do not remove rights that cannot legally be excluded.'],
    },
    contact: {
      title: 'Contact', description: 'Current support contact status for the PDFEditGo project.',
      paragraphs: ['A public operator email address or support form has not yet been configured for this project. There is no contact form on this page and no message is sent from it.', 'A verified contact channel must be added before a general public launch. Please do not send private documents or sensitive file contents through public issue trackers or unverified contact addresses.'],
    },
  },
  ko: {
    about: {
      title: 'PDFEditGo 소개', description: '회원가입이나 파일 업로드 없이 브라우저에서 사용하는 무료 PDF 도구를 소개합니다.',
      paragraphs: ['PDFEditGo는 PDF 합치기, 페이지 편집, PDF의 이미지 변환, 이미지의 PDF 변환을 돕습니다. DOCX·HWP 5.0·HWPX 문서와 PPTX 슬라이드를 이미지형 PDF로 만드는 도구도 제공합니다. 회원가입이나 유료 변환 서비스 없이 일상적인 PDF 작업을 브라우저에서 할 수 있도록 설계했습니다.', '사용자가 직접 선택한 파일만 읽어 내 기기에서 처리합니다. 원본은 변경하지 않으며, 결과는 사용자가 내려받을 별도의 파일로 만듭니다.', '처리 가능 범위는 브라우저와 기기의 여유 메모리에 따라 달라집니다. 암호화·손상된 PDF나 매우 큰 작업은 지원하지 않을 수 있으므로 중요한 결과물은 직접 확인해 주세요.'],
    },
    privacy: {
      title: '개인정보 처리 안내', description: 'PDFEditGo의 파일 처리 방식, 브라우저 메모리 사용과 웹사이트 접속 정보를 안내합니다.',
      paragraphs: ['선택한 PDF, 워드·한글·파워포인트 문서, 이미지의 내용은 브라우저에서 처리합니다. 파일을 운영 서버로 업로드하거나 서버에서 저장·변환하지 않습니다. 만들어진 문서와 이미지는 내려받거나 작업을 종료할 때까지 브라우저에 있습니다.', '다운로드한 파일은 브라우저 설정에 따라 저장됩니다. 페이지를 닫으면 해당 세션의 브라우저 자원이 해제되지만, 내려받은 파일은 직접 삭제할 때까지 기기에 남습니다. 브라우저 로컬 저장소에는 사용자가 선택한 언어만 보관합니다. 선택한 파일과 생성된 결과는 로컬 저장소나 IndexedDB에 저장하지 않습니다. 첫 홈페이지 방문 시 브라우저의 선호 언어를 기준으로 지원 언어를 자동 선택할 수 있습니다. 직접 선택한 언어와 명시적인 언어별 주소를 우선하며, IP 기반 국가 조회나 위치 정보 API는 사용하지 않습니다.', '웹사이트 제공을 위한 일반적인 네트워크 요청은 발생합니다. 호스팅 제공자는 자체 정책에 따라 IP 주소, 요청 시각, 브라우저 정보, 보안 로그 등의 접속 정보를 처리할 수 있습니다. 파일을 로컬에서 처리한다는 설명이 방문 기록도 전혀 남지 않는다는 의미는 아닙니다.', '현재 버전은 쿠키를 설정하지 않으며 광고나 분석 추적기를 포함하지 않습니다. 해당 서비스를 도입할 경우 적용 전에 이 안내와 필요한 동의 관리 기능을 갱신해야 합니다.', '신뢰할 수 없는 기기나 브라우저 환경에서는 이 서비스를 사용하지 마세요. 브라우저 확장 프로그램과 기기에 설치된 다른 소프트웨어는 이 사이트의 통제 범위 밖에 있습니다.'],
    },
    terms: {
      title: '이용약관', description: 'PDFEditGo의 무료 브라우저 도구를 이용할 때 적용되는 조건입니다.',
      paragraphs: ['처리할 권한이 있는 파일에만 도구를 사용하세요. 문서의 내용과 결과물의 사용에 대한 책임은 사용자에게 있습니다.', '도구는 회원가입과 건별 이용료 없이 제공됩니다. 파일 크기·개수, 페이지 수, 렌더링 해상도 등의 제한은 브라우저 메모리를 보호하기 위한 것으로 모든 문서의 지원을 보장하지 않습니다.', '원본 파일을 보관하고 다운로드한 결과를 확인하세요. 편집 시 전자서명이 무효가 되거나 북마크, 입력 양식 등의 문서 부가 기능이 유지되지 않을 수 있습니다.', '관련 법률이 허용하는 범위에서 서비스는 제공 가능한 상태로 제공되며, 중단 없는 이용이나 특정 목적에 대한 적합성을 보장하지 않습니다. 법률상 배제할 수 없는 사용자의 권리는 이 약관으로 제한하지 않습니다.'],
    },
    contact: {
      title: '문의', description: 'PDFEditGo 프로젝트의 현재 문의 채널 설정 상태입니다.',
      paragraphs: ['이 프로젝트에는 공개 운영자 이메일이나 문의 양식이 아직 설정되지 않았습니다. 이 페이지에는 문의 양식이 없으며 메시지를 전송하지 않습니다.', '일반 공개 운영 전에 확인된 문의 채널을 추가해야 합니다. 공개 이슈 게시판이나 확인되지 않은 연락처로 개인 문서 또는 민감한 파일 내용을 보내지 마세요.'],
    },
  },
  es: {
    about: {
      title: 'Acerca de PDFEditGo', description: 'Conoce las herramientas PDF gratuitas que funcionan en el navegador sin cuentas ni subida de archivos.',
      paragraphs: ['PDFEditGo permite unir PDF, organizar páginas, exportar imágenes y crear PDF a partir de imágenes. También convierte documentos DOCX, HWP 5.0, HWPX y presentaciones PPTX a PDF de imágenes. Está pensado para tareas habituales en el navegador, sin cuenta ni servicio de conversión de pago.', 'Las herramientas leen los archivos que seleccionas y los procesan en tu dispositivo. Los originales no cambian. El resultado es un archivo independiente que puedes descargar.', 'El procesamiento depende de tu navegador y de la memoria disponible. Los PDF cifrados o dañados y las tareas muy grandes pueden no ser compatibles. Revisa los resultados importantes antes de utilizarlos.'],
    },
    privacy: {
      title: 'Política de privacidad', description: 'Cómo trata PDFEditGo los archivos seleccionados, la memoria del navegador y los datos de acceso a la web.',
      paragraphs: ['El contenido de los PDF, documentos Word, Hangul y PowerPoint e imágenes seleccionados se procesa en tu navegador. No se sube, almacena ni convierte en nuestros servidores. Los documentos e imágenes generados permanecen en el navegador hasta que los descargues o termines la tarea.', 'Los archivos descargados se guardan según la configuración de tu navegador. Al cerrar la página se liberan los recursos de la sesión; las descargas permanecen en el dispositivo hasta que las elimines. La web guarda únicamente el idioma que has elegido en el almacenamiento local del navegador. Los archivos seleccionados y los resultados no se guardan en el almacenamiento local ni en IndexedDB. En la primera visita a la página de inicio, los idiomas preferidos del navegador pueden seleccionar automáticamente un idioma disponible. Tienen prioridad los enlaces de idioma explícitos y tu elección manual guardada. No se realizan consultas de país por IP ni se utiliza una API de geolocalización.', 'Para servir la web se realizan solicitudes de red normales. El proveedor de alojamiento puede tratar direcciones IP, horas de acceso, datos del navegador y registros de seguridad conforme a sus políticas. Procesar archivos localmente no implica que la visita no deje registros de red.', 'Esta versión no establece cookies ni incluye publicidad o herramientas de seguimiento analítico. Si se incorporan, deben actualizarse esta política y los controles de consentimiento necesarios antes de activarlas.', 'No utilices el servicio en un dispositivo o navegador que no sea de confianza. Las extensiones del navegador y otro software de tu dispositivo quedan fuera del control de esta web.'],
    },
    terms: {
      title: 'Condiciones de uso', description: 'Condiciones de las herramientas gratuitas de PDFEditGo que funcionan en el navegador.',
      paragraphs: ['Utiliza estas herramientas únicamente con archivos que tengas autorización para procesar. Eres responsable de tus documentos, su contenido y el uso del resultado.', 'Las herramientas no requieren cuenta ni pago por uso. Los límites de tamaño, cantidad de archivos, páginas o resolución protegen la memoria del navegador y no garantizan la compatibilidad con todos los documentos.', 'Conserva los originales y revisa las descargas. Editar puede invalidar firmas digitales y no conservar marcadores, formularios interactivos u otras funciones del documento.', 'El servicio se ofrece según disponibilidad, sin garantizar acceso ininterrumpido ni idoneidad para un fin concreto, en la medida permitida por la legislación aplicable. Estas condiciones no excluyen derechos que legalmente no puedan excluirse.'],
    },
    contact: {
      title: 'Contacto', description: 'Estado actual del canal de soporte del proyecto PDFEditGo.',
      paragraphs: ['Todavía no se ha configurado un correo público del operador ni un formulario de soporte para este proyecto. Esta página no contiene un formulario y no envía mensajes.', 'Antes del lanzamiento público general debe añadirse un canal de contacto verificado. No envíes documentos privados ni contenido sensible a gestores de incidencias públicos o direcciones sin verificar.'],
    },
  },
  ja: {
    about: {
      title: 'PDFEditGoについて', description: '登録やアップロードを必要としない、ブラウザで使える無料PDFツールについてご紹介します。',
      paragraphs: ['PDFEditGoは、PDFの結合、ページ編集、画像への変換、画像からのPDF作成を支援します。DOCX・HWP 5.0・HWPX文書やPPTXスライドを画像形式のPDFにする機能も用意しています。アカウントや有料変換サービスを使わず、日常のPDF作業をブラウザで行えるように設計しています。', 'ユーザーが選択したファイルを読み込み、お使いの端末で処理します。元のファイルは変更しません。結果は別のファイルとして作成され、ダウンロードできます。', '処理可能な範囲はブラウザや使用可能なメモリによって異なります。暗号化・破損したPDFや非常に大きな作業には対応できない場合があります。重要な結果はご確認ください。'],
    },
    privacy: {
      title: 'プライバシーポリシー', description: 'PDFEditGoでの選択ファイル、ブラウザメモリ、ウェブサイトへのアクセス情報の取り扱いについて。',
      paragraphs: ['選択したPDF、Word・ハングル・PowerPoint文書、画像の内容はブラウザ内で処理します。当サイトのサーバーにアップロード・保存したり、サーバーで変換したりすることはありません。生成した文書や画像は、ダウンロードまたは作業終了までブラウザ内に保持されます。', 'ダウンロードしたファイルはブラウザ設定に従って保存されます。ページを閉じるとセッションのブラウザ資源は解放されますが、保存済みファイルは削除するまで端末に残ります。ブラウザのローカルストレージには、ユーザーが選択した言語のみを保存します。選択したファイルや生成した結果をローカルストレージやIndexedDBに保存することはありません。初めてホームページにアクセスした際は、ブラウザの優先言語に基づいて対応言語を自動選択する場合があります。明示的な言語別リンクと保存された手動選択を優先します。IPアドレスによる国の照会や位置情報APIは使用しません。', 'サイトの配信には通常のネットワーク通信が必要です。ホスティング事業者は自社の方針に従い、IPアドレス、アクセス日時、ブラウザ情報、セキュリティログなどを処理する場合があります。ファイルを端末内で処理することは、訪問に関する通信記録が一切残らないことを意味しません。', '現在のバージョンはCookieを設定せず、広告やアクセス解析用トラッカーも含めていません。これらを導入する場合は、有効化前にこの方針と必要な同意管理機能を更新する必要があります。', '信頼できない端末やブラウザ環境では利用しないでください。ブラウザ拡張機能や端末上の他のソフトウェアは、当サイトの管理対象外です。'],
    },
    terms: {
      title: '利用規約', description: 'PDFEditGoの無料ブラウザツールを利用する際の条件について。',
      paragraphs: ['処理する権限を持つファイルにのみご利用ください。文書の内容や出力結果の利用に関する責任はユーザーが負います。', 'アカウント登録や利用ごとの料金はありません。ファイル容量・数、ページ数、描画解像度などの制限はブラウザメモリを保護するためのもので、すべての文書への対応を保証するものではありません。', '元のファイルを保管し、ダウンロードした結果を確認してください。編集により電子署名が無効になったり、しおりや入力フォームなどが保持されなかったりする場合があります。', '適用法令で認められる範囲で、サービスは提供可能な状態で提供され、継続した利用や特定目的への適合性を保証しません。法令上排除できない権利を、この規約で制限することはありません。'],
    },
    contact: {
      title: 'お問い合わせ', description: 'PDFEditGoプロジェクトの現在の問い合わせ先設定状況。',
      paragraphs: ['このプロジェクトには、公開用の運営者メールアドレスやサポートフォームがまだ設定されていません。このページに送信フォームはなく、メッセージは送信されません。', '一般公開前に、確認済みの問い合わせ先を追加する必要があります。公開の課題管理ページや未確認の連絡先に、個人文書や機密性の高いファイル内容を送らないでください。'],
    },
  },
};

const publishedContact: Record<Locale, string[]> = {
  en: [
    'For questions about PDFEditGo, use the published email address below. Describe the tool, your browser and the problem without including private documents or sensitive file contents.',
    'The email address is a contact channel; a response or response time is not guaranteed. Your files are processed on your device, so we cannot access or recover the files you selected.',
  ],
  ko: [
    'PDFEditGo 관련 문의는 아래 공개된 이메일 주소를 이용해 주세요. 개인 문서나 민감한 파일 내용은 보내지 말고, 사용한 도구와 브라우저, 발생한 문제를 설명해 주세요.',
    '이메일은 문의 채널이며 답변 여부나 답변 시간을 보장하지 않습니다. 파일은 사용자 기기에서 처리하므로 선택한 파일에 접근하거나 파일을 복구할 수 없습니다.',
  ],
  es: [
    'Para consultas sobre PDFEditGo, utiliza la dirección de correo publicada a continuación. Describe la herramienta, tu navegador y el problema sin incluir documentos privados ni contenido sensible.',
    'El correo es un canal de contacto; no se garantiza una respuesta ni un plazo de respuesta. Los archivos se procesan en tu dispositivo, por lo que no podemos acceder a los archivos seleccionados ni recuperarlos.',
  ],
  ja: [
    'PDFEditGoに関するお問い合わせは、以下に掲載したメールアドレスをご利用ください。個人文書や機密性の高いファイル内容は送らず、使用したツール、ブラウザ、問題の内容をお知らせください。',
    'メールは連絡窓口であり、返信の有無や時期を保証するものではありません。ファイルはお使いの端末で処理するため、選択したファイルへのアクセスや復元はできません。',
  ],
};

export function legalContent(locale: Locale, slug: LegalSlug, contactConfigured = false): LegalContent {
  const entry = legal[locale][slug];
  return slug === 'contact' && contactConfigured
    ? { ...entry, paragraphs: publishedContact[locale] }
    : entry;
}
