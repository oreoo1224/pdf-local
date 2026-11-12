import type { Locale } from './i18n';

type LocalizedText = Record<Locale, string>;

interface OpenSourceCredit {
  name: string;
  version?: string;
  license: string;
  upstream: string;
  licensePath: string;
  noticesPath?: string;
  purpose: LocalizedText;
}

export const openSourceCredits: readonly OpenSourceCredit[] = [
  {
    name: 'pdf-lib',
    version: '1.17.1',
    license: 'MIT',
    upstream: 'https://github.com/Hopding/pdf-lib',
    licensePath: '/licenses/pdf-lib.txt',
    purpose: {
      en: 'Create PDFs, merge files, and edit or organize pages.',
      ko: 'PDF를 만들고 파일을 합치며 페이지를 편집하거나 정리합니다.',
      es: 'Crea PDF, combina archivos y permite editar u organizar páginas.',
      ja: 'PDFの作成、ファイルの結合、ページの編集や整理に使用します。',
    },
  },
  {
    name: 'PDF.js',
    version: '6.5.438',
    license: 'Apache-2.0',
    upstream: 'https://github.com/mozilla/pdf.js',
    licensePath: '/licenses/pdfjs-dist.txt',
    purpose: {
      en: 'Read and render PDF pages for previews and image export.',
      ko: '미리보기와 이미지 저장을 위해 PDF 페이지를 읽고 표시합니다.',
      es: 'Lee y renderiza páginas PDF para las vistas previas y la exportación de imágenes.',
      ja: 'プレビューと画像の書き出しのためにPDFページを読み込み、描画します。',
    },
  },
  {
    name: 'fflate',
    version: '0.8.3',
    license: 'MIT',
    upstream: 'https://github.com/101arrowz/fflate',
    licensePath: '/licenses/fflate.txt',
    purpose: {
      en: 'Read compressed document archives and create ZIP downloads.',
      ko: '압축된 문서 데이터를 읽고 내려받을 ZIP 파일을 만듭니다.',
      es: 'Lee archivos de documentos comprimidos y crea descargas ZIP.',
      ja: '圧縮された文書データの読み込みと、ダウンロード用ZIPファイルの作成に使用します。',
    },
  },
  {
    name: '@silurus/ooxml',
    version: '0.89.9',
    license: 'MIT',
    upstream: 'https://github.com/yukiyokotani/office-open-xml-viewer',
    licensePath: '/licenses/silurus-ooxml.txt',
    noticesPath: '/licenses/silurus-ooxml-third-party.txt',
    purpose: {
      en: 'Read and render DOCX documents and PPTX presentations.',
      ko: 'DOCX 문서와 PPTX 프레젠테이션을 읽고 표시합니다.',
      es: 'Lee y renderiza documentos DOCX y presentaciones PPTX.',
      ja: 'DOCX文書とPPTXプレゼンテーションを読み込み、描画します。',
    },
  },
  {
    name: '@rhwp/core',
    version: '0.9.0',
    license: 'MIT',
    upstream: 'https://github.com/edwardkim/rhwp',
    licensePath: '/licenses/rhwp-core.txt',
    noticesPath: '/licenses/rhwp-notices/THIRD_PARTY_LICENSES.md',
    purpose: {
      en: 'Read and render Hangul HWP 5.0 and HWPX documents.',
      ko: '한글 HWP 5.0 및 HWPX 문서를 읽고 표시합니다.',
      es: 'Lee y renderiza documentos Hangul HWP 5.0 y HWPX.',
      ja: 'ハングルのHWP 5.0およびHWPX文書を読み込み、描画します。',
    },
  },
  {
    name: 'Noto Sans KR',
    license: 'SIL Open Font License 1.1',
    upstream: 'https://github.com/google/fonts/tree/main/ofl/notosanskr',
    licensePath: '/fonts/OFL.txt',
    purpose: {
      en: 'Provide a locally hosted font for document rendering.',
      ko: '문서를 표시할 때 이 사이트에서 제공하는 글꼴로 사용합니다.',
      es: 'Proporciona una fuente alojada en este sitio para renderizar documentos.',
      ja: '文書の描画に、このサイトで配信するフォントを使用します。',
    },
  },
];

interface CreditsText {
  heading: string;
  introduction: string;
  processing: string;
  licenseText: string;
  thirdPartyNotices: string;
  buildTechnology: string;
  scope: string;
}

export const creditsText: Record<Locale, CreditsText> = {
  en: {
    heading: 'Open-source credits',
    introduction: 'PDFEditGo uses these open-source libraries and font. We thank their authors and contributors.',
    processing: 'The libraries and supporting assets are downloaded from this website’s host when first needed. They run in your browser on your device; document contents are not sent to an external conversion API.',
    licenseText: 'License text',
    thirdPartyNotices: 'Bundled third-party notices',
    buildTechnology: 'Website build technology',
    scope: 'These credits cover the main libraries and font used by the tools. The linked license files retain upstream copyright and license terms. Bundled dependencies have additional notices where linked.',
  },
  ko: {
    heading: '오픈 소스 크레딧',
    introduction: 'PDFEditGo는 다음 오픈 소스 라이브러리와 글꼴을 사용합니다. 제작자와 기여자 여러분께 감사드립니다.',
    processing: '라이브러리와 관련 리소스는 처음 필요할 때 이 웹사이트의 호스트에서 내려받습니다. 내 기기의 브라우저에서 실행되며 문서 내용은 외부 변환 API로 전송되지 않습니다.',
    licenseText: '라이선스 전문',
    thirdPartyNotices: '포함된 타사 구성 요소 고지',
    buildTechnology: '웹사이트 제작 기술',
    scope: '이 목록은 도구에서 사용하는 주요 라이브러리와 글꼴을 소개합니다. 연결된 라이선스 파일에는 원본 저작권 및 라이선스 조건이 보존되어 있습니다. 포함된 의존성의 추가 고지가 있는 경우 함께 연결했습니다.',
  },
  es: {
    heading: 'Créditos de código abierto',
    introduction: 'PDFEditGo utiliza estas bibliotecas y esta fuente de código abierto. Agradecemos a sus autores y colaboradores.',
    processing: 'Las bibliotecas y los recursos necesarios se descargan del servidor de este sitio web cuando se necesitan por primera vez. Se ejecutan en el navegador de tu dispositivo; el contenido de los documentos no se envía a una API de conversión externa.',
    licenseText: 'Texto de la licencia',
    thirdPartyNotices: 'Avisos de terceros incluidos',
    buildTechnology: 'Tecnología de desarrollo del sitio web',
    scope: 'Estos créditos abarcan las principales bibliotecas y la fuente que utilizan las herramientas. Los archivos de licencia enlazados conservan los derechos de autor y las condiciones originales. Se incluyen enlaces a avisos adicionales de las dependencias cuando corresponde.',
  },
  ja: {
    heading: 'オープンソースのクレジット',
    introduction: 'PDFEditGoは以下のオープンソースライブラリとフォントを使用しています。作者と貢献者の皆様に感謝します。',
    processing: 'ライブラリと関連リソースは、最初に必要になったときにこのウェブサイトのホストからダウンロードされます。お使いの端末のブラウザで実行され、文書の内容が外部の変換APIに送信されることはありません。',
    licenseText: 'ライセンス全文',
    thirdPartyNotices: '同梱されたサードパーティの告知',
    buildTechnology: 'ウェブサイトの構築技術',
    scope: 'この一覧では、ツールで使用する主なライブラリとフォントを紹介しています。リンク先のライセンスファイルには、原作者の著作権表示とライセンス条件を保持しています。同梱された依存関係に追加の告知がある場合は、そのリンクも掲載しています。',
  },
};
