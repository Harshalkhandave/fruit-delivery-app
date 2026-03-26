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
  },
  fullScreen: {
    flex: 1,
    backgroundColor: 'white',
    margin: 0,
  },
  map: {
    flex: 1,
  },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    elevation: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 10,
  },
});