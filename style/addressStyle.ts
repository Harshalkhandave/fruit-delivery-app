import { StyleSheet } from 'react-native';

export const addressStyles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '85%',
  },
  modalTitle: {
    marginBottom: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readOnlyInput: {
    backgroundColor: '#f0f0f0',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    marginLeft: 5,
  }
});