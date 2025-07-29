import { createApp, ref, onMounted, reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

createApp({
  setup() {
    const translations = ref([]);
    const languages = ref([]);
    const search = ref('');
    const showAddModal = ref(false);
    const newTranslation = reactive({
      key: '',
    });
    const editingId = ref(null);
    const editingTranslation = reactive({});
    const showHistoryModal = ref(false);
    const historyData = ref([]);
    const historyKey = ref('');
    const showImportModal = ref(false);
    const selectedFile = ref(null);

    const fetchTranslations = async () => {
      try {
        const url = search.value ? `/api/translations?search=${search.value}` : '/api/translations';
        const response = await fetch(url);
        const data = await response.json();
        translations.value = data.data;
        if (data.languages && data.languages.length > 0) {
          languages.value = data.languages;
          // Initialize newTranslation object with language keys
          data.languages.forEach(lang => {
            newTranslation[lang] = '';
          });
        }
      } catch (error) {
        console.error('Error fetching translations:', error);
      }
    };

    const addTranslation = async () => {
      try {
        const response = await fetch('/api/translations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTranslation),
        });
        if (response.ok) {
          await fetchTranslations();
          showAddModal.value = false;
          // Reset newTranslation
          newTranslation.key = '';
          languages.value.forEach(lang => {
            newTranslation[lang] = '';
          });
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error adding translation:', error);
      }
    };

    const startEditing = (translation) => {
      editingId.value = translation.id;
      Object.assign(editingTranslation, translation);
    };

    const cancelEditing = () => {
      editingId.value = null;
    };

    const saveChanges = async (id) => {
      try {
        const response = await fetch(`/api/translations/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editingTranslation),
        });
        if (response.ok) {
          await fetchTranslations();
          cancelEditing();
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error saving changes:', error);
      }
    };

    const exportData = async () => {
      try {
        const response = await fetch('/api/translations/export');
        const data = await response.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "translations.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      } catch (error) {
        console.error('Error exporting data:', error);
      }
    };

    const showHistory = async (translationId) => {
      try {
        const response = await fetch(`/api/history/${translationId}`);
        const data = await response.json();
        historyData.value = data.data;
        // Find the key for the current translationId to display in the modal title
        const translation = translations.value.find(t => t.id === translationId);
        historyKey.value = translation ? translation.key : '';
        showHistoryModal.value = true;
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    const handleFileUpload = (event) => {
      selectedFile.value = event.target.files[0];
    };

    const importData = async () => {
      if (!selectedFile.value) {
        alert('Please select a file to import.');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile.value);

      try {
        const response = await fetch('/api/translations/import', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          alert('Import successful!');
          showImportModal.value = false;
          selectedFile.value = null;
          await fetchTranslations(); // Refresh data after import
        } else {
          const errorData = await response.json();
          alert(`Import failed: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error during import:', error);
        alert('An error occurred during import.');
      }
    };

    onMounted(fetchTranslations);

    return {
      translations,
      languages,
      search,
      showAddModal,
      newTranslation,
      editingId,
      editingTranslation,
      showHistoryModal,
      historyData,
      historyKey,
      showImportModal,
      selectedFile,
      fetchTranslations,
      addTranslation,
      startEditing,
      cancelEditing,
      saveChanges,
      exportData,
      showHistory,
      handleFileUpload,
      importData,
    };
  }
}).mount('#app');

