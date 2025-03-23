import { useState } from 'react'
import {
  ChakraProvider,
  Box,
  Stack,
  Heading,
  Text,
  Button,
  Textarea,
  useToast,
  Container,
  Image,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import axios from 'axios'

// Create a custom axios instance
const api = axios.create({
  baseURL: '',  // Use relative URL to work with the proxy
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for better error handling
api.interceptors.request.use(function (config) {
  return config;
}, function (error) {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Add response interceptor for better error handling
api.interceptors.response.use(function (response) {
  return response;
}, function (error) {
  console.error('Response error:', error);
  if (error.code === 'ERR_NETWORK') {
    error.message = 'Unable to connect to server. Please ensure the server is running and try again.';
  }
  return Promise.reject(error);
});

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
      }
      reader.onerror = () => {
        setError('Error reading file')
        toast({
          title: 'Error reading file',
          description: 'Please try again with a different image',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const extractText = async () => {
    if (!selectedImage) {
      setError('Please select an image first')
      toast({
        title: 'No image selected',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      console.log('Sending request to extract text...')
      const response = await api.post('/api/extract-text', {
        image: selectedImage
      })
      
      console.log('Response received:', response.data)
      
      if (response.data.text) {
        setExtractedText(response.data.text)
        toast({
          title: 'Text extracted successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      } else {
        throw new Error('No text found in image')
      }
    } catch (error: any) {
      let errorMessage = 'Failed to extract text'
      console.error('Error:', error)
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please try again.'
        } else if (!error.response) {
          errorMessage = 'Network error. Please check if the server is running.'
        } else {
          errorMessage = error.response.data?.error || 'Server error occurred'
        }
      }

      setError(errorMessage)
      toast({
        title: 'Error extracting text',
        description: errorMessage,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      setExtractedText('')
    }
    setIsLoading(false)
  }

  const downloadText = () => {
    if (!extractedText) {
      setError('No text available to download')
      toast({
        title: 'No text to download',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const element = document.createElement('a')
      const file = new Blob([extractedText], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = 'extracted-text.txt'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      
      toast({
        title: 'Text downloaded successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    } catch (error) {
      setError('Error downloading text')
      toast({
        title: 'Error downloading text',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <ChakraProvider>
      <Container maxW="container.md" py={10}>
        <Stack spacing={6}>
          <Heading textAlign="center">Image to Text Converter</Heading>
          
          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          <Box>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <Button as="span" width="full" colorScheme="blue">
                Upload Image
              </Button>
            </label>
          </Box>

          {selectedImage && (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" p={2}>
              <Image
                src={selectedImage}
                alt="Selected"
                maxH="300px"
                mx="auto"
                objectFit="contain"
              />
            </Box>
          )}

          <Button
            onClick={extractText}
            colorScheme="green"
            isLoading={isLoading}
            loadingText="Extracting..."
          >
            Extract Text
          </Button>

          {extractedText && (
            <Box>
              <Text mb={2} fontWeight="bold">
                Extracted Text:
              </Text>
              <Textarea
                value={extractedText}
                readOnly
                height="200px"
                mb={4}
              />
              <Button onClick={downloadText} colorScheme="purple">
                Download Text
              </Button>
            </Box>
          )}
        </Stack>
      </Container>
    </ChakraProvider>
  )
}

export default App
