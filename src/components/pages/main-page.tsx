
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Clipboard, ClipboardCheck, Link2, Calendar, Globe, Info, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TimeState = {
  originalTime?: string;
  localTime?: string;
  error?: string;
}

const LinkedInIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white"
    >
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );


export default function MainPage() {
  const [url, setUrl] = useState('');
  const [timeState, setTimeState] = useState<TimeState>({});
  const [copiedTime, setCopiedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getPostId = (linkedinURL: string) => {
    const regex = /([0-9]{19})/;
    const postId = regex.exec(linkedinURL)?.pop();
    return postId;
  }

  const getCommentId = (linkedinURL: string) => {
    const decodedUrl = decodeURIComponent(linkedinURL);
    const regex = /fsd_comment:\((\d+),urn:li:activity:\d+\)/;
    const match = regex.exec(decodedUrl);
    
    if (match) {
      const commentId = match[1]; // The captured group
      return commentId;
    }
  
    return null;
  }

  const extractUnixTimestamp = (id: string | undefined) => {
    if(id == null) {
      return null;
    }
    // BigInt needed as we need to treat id as 64 bit decimal. This reduces browser support.
    try {
      const asBinary = BigInt(id).toString(2);
      const first41Chars = asBinary.slice(0, 41);
      const timestamp = parseInt(first41Chars, 2);
      return timestamp;
    } catch(e) {
      return null;
    }
  }

  const unixTimestampToHumanDate = (timestamp: number | null) => {
    if (timestamp === null) return 'Invalid Link';
    const dateObject = new Date(timestamp);
    return dateObject.toUTCString();
  }
  
  const unixTimestampToLocalDate = (timestamp: number | null) => {
    if (timestamp === null) return 'Invalid Link';
    const dateObject = new Date(timestamp);
    return dateObject.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
  }


  const handleExtract = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTimeState({}); // Clear previous results
    setIsLoading(true);

    if (!url.includes('linkedin.com/')) {
        setTimeState({ error: 'Please enter a valid LinkedIn URL.' });
        setIsLoading(false);
        return;
    }
    
    setTimeout(() => {
        const postId = getPostId(url);
        const commentId = getCommentId(url);
        
        let unixTimestamp: number | null = null;
        
        if (commentId) {
          unixTimestamp = extractUnixTimestamp(commentId);
        }
        else if (postId) {
          unixTimestamp = extractUnixTimestamp(postId);
        } else {
           setTimeState({ error: 'Could not extract a valid ID from the URL.' });
           setIsLoading(false);
           return;
        }

        if (unixTimestamp === null) {
            setTimeState({ error: 'Could not calculate timestamp from the URL. It may be an invalid post or comment link.' });
            setIsLoading(false);
            return;
        }
      
        const humanDateFormat = unixTimestampToHumanDate(unixTimestamp);
        const localDateFormat = unixTimestampToLocalDate(unixTimestamp);

        setTimeState({ originalTime: humanDateFormat, localTime: localDateFormat });
        setIsLoading(false);
    }, 1000)
  };

  const handleCopy = async (timeToCopy: string) => {
    if (!timeToCopy) return;
    try {
      await navigator.clipboard.writeText(timeToCopy);
      setCopiedTime(timeToCopy);
      toast({
        title: "Copied to clipboard!",
      })
      setTimeout(() => setCopiedTime(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy time to clipboard.",
      })
    }
  };

  return (
    <div className="bg-background font-body flex items-center justify-center min-h-screen">
    <main className="flex w-full flex-col items-center p-4 sm:p-6">
      <Card className="w-full max-w-2xl shadow-2xl rounded-2xl">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-3">
             <LinkedInIcon />
            <CardTitle className="text-3xl font-bold tracking-tight">LinkedTime</CardTitle>
          </div>
          <CardDescription className="text-primary-foreground/80 text-base">
            Instantly find the posting time of any LinkedIn post
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleExtract} className="space-y-4">
            <div className='space-y-2'>
                <label htmlFor='url' className='flex items-center gap-2 text-sm font-medium text-foreground/80'>
                    <Link2 className="h-4 w-4" />
                    LinkedIn Post URL
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        id="url"
                        name="url"
                        type="url"
                        placeholder="https://www.linkedin.com/posts/..."
                        required
                        className="flex-grow rounded-lg text-base"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button type="submit" className="w-full sm:w-auto rounded-lg" disabled={isLoading}>
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Extracting...
                            </div>
                        ) : (
                            <>
                                <Search className="mr-2 h-4 w-4" />
                                Extract Date
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">Paste the full URL of the LinkedIn post above</p>
            </div>
          </form>

          {timeState.error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{timeState.error}</AlertDescription>
            </Alert>
          )}

          {timeState.localTime && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card rounded-lg">
                  <CardContent className="p-4 flex justify-between items-center">
                      <div className='space-y-1'>
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                            <Calendar className="h-4 w-4" />
                            <span>Your Local Time</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{timeState.localTime}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(timeState.localTime!)} className="text-muted-foreground hover:text-foreground">
                          {copiedTime === timeState.localTime ? <ClipboardCheck className="h-5 w-5" /> : <Clipboard className="h-5 w-5" />}
                          <span className='sr-only'>Copy local time</span>
                      </Button>
                  </CardContent>
              </Card>
              <Card className="bg-card rounded-lg">
                  <CardContent className="p-4 flex justify-between items-center">
                        <div className='space-y-1'>
                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                <Globe className="h-4 w-4" />
                                <span>Original Post Time (UTC)</span>
                            </div>
                            <p className="text-lg font-semibold text-foreground">{timeState.originalTime}</p>
                        </div>
                          <Button variant="ghost" size="icon" onClick={() => handleCopy(timeState.originalTime!)} className="text-muted-foreground hover:text-foreground">
                              {copiedTime === timeState.originalTime ? <ClipboardCheck className="h-5 w-5" /> : <Clipboard className="h-5 w-5" />}
                              <span className='sr-only'>Copy UTC time</span>
                          </Button>
                  </CardContent>
              </Card>
            </div>
          )}

          <Alert className="bg-accent/10 border-accent/20 rounded-lg">
            <Info className="h-4 w-4 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground font-semibold">How it works</AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              This tool extracts the original posting date from LinkedIn post URLs. Simply paste the full URL of any LinkedIn post and click "Extract Date" to see when it was originally posted.
            </AlertDescription>
          </Alert>
        </CardContent>
        <div className="text-center py-4 text-sm text-muted-foreground border-t rounded-b-2xl">
            Made with <Heart className="inline h-4 w-4 text-red-500 fill-current" /> for LinkedIn users
        </div>
      </Card>
    </main>
    </div>
  );
}
