/** Copy for governorate / area fields and the location filter. Keep en and ar keys in sync. */
export const placeMessages = {
  en: {
    governorate: 'Governorate',
    governorateChoose: 'Choose a governorate',
    governorateAny: 'All of Egypt',
    filterGovernorate: 'Filter by governorate',
    fieldGovernorate: 'Choose the governorate where you’ll hand the book over.',
    governorateHint: 'Rfoof doesn’t ship books, so buyers filter by governorate to find books they can meet up for.',
    cityArea: 'City or district',
    cityAreaHint: 'e.g. Nasr City, Smouha or Fayoum City. Never your home address.',
  },
  ar: {
    governorate: 'المحافظة',
    governorateChoose: 'اختر المحافظة',
    governorateAny: 'كل مصر',
    filterGovernorate: 'تصفية حسب المحافظة',
    fieldGovernorate: 'اختر المحافظة التي ستسلّم فيها الكتاب.',
    governorateHint: 'رفوف لا تشحن الكتب، لذلك يبحث المشترون حسب المحافظة ليجدوا كتباً يمكنهم استلامها.',
    cityArea: 'المدينة أو الحي',
    cityAreaHint: 'مثلاً مدينة نصر أو سموحة أو مدينة الفيوم. وليس عنوان منزلك.',
  },
} as const;
