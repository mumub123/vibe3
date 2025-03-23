import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn()
    })),
    post: vi.fn()
  }
}));

const mockedAxios = vi.mocked(axios, true);

describe('App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders main heading', () => {
    render(<App />);
    expect(screen.getByText('Image to Text Converter')).toBeInTheDocument();
  });

  it('shows upload button', () => {
    render(<App />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    
    expect(input.files?.[0]).toBe(file);
    expect(input.files?.length).toBe(1);
  });

  it('shows error for large files', async () => {
    render(<App />);
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, largeFile);
    
    expect(await screen.findByText('File size must be less than 5MB')).toBeInTheDocument();
  });

  it('shows error for invalid file types', async () => {
    render(<App />);
    const invalidFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, invalidFile);
    
    expect(await screen.findByText('Please select a valid image file')).toBeInTheDocument();
  });

  it('handles successful text extraction', async () => {
    const mockResponse = { data: { text: 'Extracted text content' } };
    const mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn().mockResolvedValueOnce(mockResponse)
    };
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    fireEvent.click(screen.getByText('Extract Text'));

    await waitFor(() => {
      expect(screen.getByText('Extracted text content')).toBeInTheDocument();
    });
  });

  it('handles text extraction error', async () => {
    const mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn().mockRejectedValueOnce(new Error('Network error'))
    };
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    fireEvent.click(screen.getByText('Extract Text'));

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('enables download button when text is extracted', async () => {
    const mockResponse = { data: { text: 'Extracted text content' } };
    const mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn().mockResolvedValueOnce(mockResponse)
    };
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    fireEvent.click(screen.getByText('Extract Text'));

    await waitFor(() => {
      expect(screen.getByText('Download Text')).toBeInTheDocument();
    });
  });

  it('handles download functionality', async () => {
    const mockResponse = { data: { text: 'Extracted text content' } };
    const mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      post: vi.fn().mockResolvedValueOnce(mockResponse)
    };
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);

    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    fireEvent.click(screen.getByText('Extract Text'));

    await waitFor(() => {
      const downloadButton = screen.getByText('Download Text');
      expect(downloadButton).toBeInTheDocument();
      fireEvent.click(downloadButton);
    });
  });

  it('handles file reader error', async () => {
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: null,
      onerror: null as any,
      onload: null as any,
    };

    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);

    render(<App />);
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, file);
    mockFileReader.onerror(new Error('File reading failed'));

    expect(await screen.findByText(/Error reading file/)).toBeInTheDocument();
  });

  it('handles empty file selection', async () => {
    render(<App />);
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;
    await userEvent.upload(input, []);
    
    expect(input.files?.length).toBe(0);
  });

  it('clears error message on new file upload', async () => {
    render(<App />);
    const invalidFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    const validFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;

    await userEvent.upload(input, invalidFile);
    expect(await screen.findByText('Please select a valid image file')).toBeInTheDocument();

    await userEvent.upload(input, validFile);
    expect(screen.queryByText('Please select a valid image file')).not.toBeInTheDocument();
  });
}); 