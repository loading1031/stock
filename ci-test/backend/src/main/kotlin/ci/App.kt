package ci

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal

@SpringBootApplication
class App

fun main(args: Array<String>) {
    runApplication<App>(*args)
}

data class Quote(val code: String, val price: BigDecimal, val quantity: Long, val limitPrice: BigDecimal?, val memo: String?)

@RestController
class QuoteController {
    @GetMapping("/api/v1/stocks/{code}")
    fun quote(@PathVariable code: String) = Quote(code, BigDecimal("72350.50"), 10, null, null)
}
